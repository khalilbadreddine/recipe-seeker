#!/usr/bin/env node
/**
 * PIN SCHEDULER — pipeline step 5 (YOUR part — see the guide)
 *
 * What it does:
 *   1. Finds drafts with status='published' that have no pin yet
 *   2. GUARDRAIL (P2): refuses anything that isn't published with a live_url.
 *      The database ALSO refuses (pins_guard trigger).
 *   3. Creates one Pinterest pin per draft:
 *        POST /v5/pins { board_id, title, description, link, media_source }
 *      with `publish_at` to spread pins out (default: 6h apart), so the
 *      account shows a steady rhythm instead of bursts.
 *
 * Flags:
 *   --boards    list your Pinterest boards (to pick PINTEREST_BOARD_ID)
 *   --explain   TEACH MODE: narrates every step in plain language first
 *
 * Run:
 *   node pipeline/scripts/pin-scheduler.mjs --boards
 *   DRY_RUN=1 node pipeline/scripts/pin-scheduler.mjs --explain
 *   node pipeline/scripts/pin-scheduler.mjs
 *
 * Env (see pipeline/.env.example):
 *   PINTEREST_ACCESS_TOKEN, PINTEREST_BOARD_ID,
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY,
 *   SITE_URL, PIN_SPACING_HOURS (default 6)
 *
 * Full step-by-step: pipeline/docs/pin-scheduler-guide.md
 */

import { createDb } from './lib/db.mjs';
import { GuardrailError, assertPinCreatable } from './lib/guardrails.mjs';
import { createPinterest } from './lib/pinterest.mjs';
import { startRun, logEvent, finishRun } from './lib/runlog.mjs';

const DRY_RUN = process.env.DRY_RUN === '1';
const EXPLAIN = process.argv.includes('--explain');
const LIST_BOARDS = process.argv.includes('--boards');
const SPACING_HOURS = Number(process.env.PIN_SPACING_HOURS || 6);
const SITE_URL = (process.env.SITE_URL || 'https://recipe-seeker-client.vercel.app').replace(/\/$/, '');

function say(step, text) {
  if (EXPLAIN) console.log(`\n[teach ${step}] ${text}`);
}

async function main() {
  await startRun('scheduler');
  const pin = createPinterest();

  if (LIST_BOARDS) {
    const boards = await pin.boards();
    console.log('Your boards (copy the id you want into PINTEREST_BOARD_ID):');
    for (const b of boards.items || boards || []) {
      console.log(`  - ${b.name}  ->  ${b.id}`);
    }
    return;
  }

  const boardId = process.env.PINTEREST_BOARD_ID;
  if (!boardId) throw new Error('Missing PINTEREST_BOARD_ID. Run with --boards to find it.');

  say(1, `I connect to Pinterest with your token and to Supabase for the drafts.`);
  const db = DRY_RUN ? null : createDb();

  say(2, `I look for drafts that are 'published' (live on the blog) and have no pin yet. Pending or approved drafts are invisible to me — the P2 guardrail.`);
  const published = DRY_RUN
    ? [
        {
          id: 'dry-run-id',
          title: 'Sample: high protein overnight oats',
          description: '...',
          image: '/images/white-bean-shakshuka.webp',
          status: 'published',
          live_url: `${SITE_URL}/blog/sample-post`,
          pin_variants: [{ title: 'Sample pin title', description: 'Sample pin description' }],
        },
      ]
    : await db.select('drafts', 'select=*&status=eq.published&order=created_at.asc');

  const withPins = DRY_RUN ? [] : await db.select('pins', 'select=draft_id');
  const pinnedIds = new Set(withPins.map((p) => p.draft_id));
  const queue = published.filter((d) => !pinnedIds.has(d.id));

  if (queue.length === 0) {
    console.log('[pins] nothing to pin — no published drafts without a pin yet');
    await finishRun('ok', { pins: 0 });
    return;
  }
  console.log(`[pins] ${queue.length} draft(s) ready for pins`);
  await logEvent(`${queue.length} published draft(s) ready for pins`);

  let i = 0;
  for (const draft of queue) {
    try {
      // ======== GUARDRAIL P2 — the line nothing crosses ========
      assertPinCreatable(draft);
    } catch (e) {
      if (e instanceof GuardrailError) {
        console.error(`[pins] SKIPPED "${draft.title}": ${e.message}`);
        continue;
      }
      throw e;
    }

    const variant = draft.pin_variants?.[0] || {};
    const imageUrl = SITE_URL + draft.image;
    const publishAt = new Date(Date.now() + i * SPACING_HOURS * 3600 * 1000).toISOString();

    say(3, `For "${draft.title}" I build the pin: title + description (variant 1 of 3), link back to ${draft.live_url}, and the hero image ${imageUrl}. The image MUST be a public URL — Pinterest fetches it from your live site.`);
    say(4, `I schedule it with publish_at=${publishAt} (pin #${i + 1} goes out ${i * SPACING_HOURS}h from now) so pins spread through the day instead of bursting.`);

    const payload = {
      board_id: boardId,
      title: (variant.title || draft.title).slice(0, 100),
      description: (variant.description || draft.description || '').slice(0, 500),
      link: draft.live_url,
      media_source: { source_type: 'image_url', url: imageUrl },
      publish_at: publishAt,
    };

    if (DRY_RUN || EXPLAIN) {
      console.log('[pins] payload that WOULD be sent:');
      console.log(JSON.stringify(payload, null, 2));
      if (DRY_RUN) {
        i++;
        continue;
      }
    }

    say(5, `I send POST /v5/pins. If Pinterest rejects the schedule time, I retry the same pin immediately (no schedule) rather than failing silently.`);
    let created;
    try {
      created = await pin.createPin(payload);
    } catch (e) {
      if (/publish_at/i.test(e.message)) {
        console.log('[pins] Pinterest rejected publish_at — retrying as an immediate pin');
        const { publish_at, ...immediate } = payload;
        created = await pin.createPin(immediate);
      } else {
        throw e;
      }
    }

    if (!DRY_RUN) {
      await db.insert('pins', {
        draft_id: draft.id,
        pinterest_pin_id: created.id,
        board_id: boardId,
        title: payload.title,
        description: payload.description,
        image_url: imageUrl,
        link: draft.live_url,
        publish_at: payload.publish_at || null,
        published_at: payload.publish_at ? null : new Date().toISOString(),
      });
    }
    console.log(`[pins] pin created for "${draft.title}" -> Pinterest id ${created.id}`);
    await logEvent(`Pin created for "${draft.title}" → board ${boardId} · goes live ${payload.publish_at || 'immediately'}`);
    i++;
  }
  console.log('[pins] done');
  await logEvent(`Done — ${i} pin(s) scheduled`);
  await finishRun('ok', { pins: i });
}

main().catch(async (e) => {
  console.error('[pins] FAILED:', e.message);
  await logEvent(`FAILED: ${e.message}`, 'error');
  await finishRun('failed', { error: e.message });
  process.exit(1);
});
