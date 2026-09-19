#!/usr/bin/env node
/**
 * PUBLISHER — pipeline step 4
 *
 * What it does:
 *   1. Reads drafts with status='approved'
 *   2. GUARDRAIL (P1): refuses ANY draft that is not approved, has an empty
 *      personal_note, has no hero image, or already has a live_url.
 *      The database ALSO enforces this (CHECK constraint on live_url).
 *   3. Appends the post to client/src/data/recipes.json (the blog's source)
 *   4. Marks the draft 'published' with its live_url
 *
 * Run locally:
 *   node pipeline/scripts/publisher.mjs            # publishes approved drafts
 *   DRY_RUN=1 node pipeline/scripts/publisher.mjs  # prints what would happen
 *
 * In production this runs as a GitHub Action
 * (.github/workflows/pipeline-publish.yml) which commits recipes.json —
 * Vercel then auto-deploys the new post.
 */

import './lib/env.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createDb } from './lib/db.mjs';
import { GuardrailError, assertPublishable, slugify } from './lib/guardrails.mjs';
import { startRun, logEvent, finishRun } from './lib/runlog.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA_PATH = join(ROOT, 'client', 'src', 'data', 'recipes.json');
const DRY_RUN = process.env.DRY_RUN === '1';
const SITE_URL = process.env.SITE_URL || 'https://recipe-seeker-client.vercel.app';

function buildPost(draft) {
  const today = new Date().toISOString().slice(0, 10);
  const slug = slugify(draft.title);
  const sections = draft.body?.sections || [];
  const faqs = draft.body?.faqs || [];
  return {
    slug,
    title: draft.title,
    description: draft.description,
    lede: draft.lede,
    category: draft.category,
    image: draft.image,
    sections,
    faqs,
    relatedRecipes: [],
    datePublished: today,
    dateModified: today,
  };
}

async function main() {
  await startRun('publisher');
  const db = DRY_RUN ? null : createDb();
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  const existingSlugs = new Set((data.posts || []).map((p) => p.slug));

  const approved = DRY_RUN
    ? []
    : await db.select('drafts', 'select=*&status=eq.approved&order=reviewed_at.asc');

  if (approved.length === 0) {
    console.log('[publisher] no approved drafts — nothing to publish');
    await finishRun('ok', { published: 0 });
    return;
  }
  console.log(`[publisher] ${approved.length} approved draft(s) to publish`);
  await logEvent(`${approved.length} approved draft(s) to publish`);

  let published = 0;
  for (const draft of approved) {
    try {
      // ======== GUARDRAIL P1 — the line nothing crosses ========
      assertPublishable(draft);
    } catch (e) {
      if (e instanceof GuardrailError) {
        console.error(`[publisher] SKIPPED "${draft.title}": ${e.message}`);
        continue;
      }
      throw e;
    }

    const post = buildPost(draft);
    if (existingSlugs.has(post.slug)) {
      console.error(`[publisher] SKIPPED "${draft.title}": slug "${post.slug}" already exists`);
      continue;
    }
    const liveUrl = `${SITE_URL}/blog/${post.slug}`;

    if (DRY_RUN) {
      console.log(`[publisher] DRY_RUN — would publish "${post.title}" -> ${liveUrl}`);
      continue;
    }

    data.posts.push(post);
    existingSlugs.add(post.slug);

    // Mark published. The DB CHECK constraint (live_url requires
    // approved/published) is the second lock on this door; the status-flow
    // trigger allows approved -> published.
    await db.update('drafts', `id=eq.${draft.id}`, {
      status: 'published',
      live_url: liveUrl,
    });
    console.log(`[publisher] published "${post.title}" -> ${liveUrl}`);
    await logEvent(`Published "${post.title}" → ${liveUrl}`);
    published++;
  }

  if (!DRY_RUN && published > 0) {
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
    console.log(`[publisher] recipes.json updated with ${published} new post(s)`);
  } else if (DRY_RUN) {
    console.log('[publisher] DRY_RUN — recipes.json untouched');
  } else {
    console.log('[publisher] nothing was publishable');
  }
  await finishRun('ok', { published });
}

main().catch(async (e) => {
  console.error('[publisher] FAILED:', e.message);
  await logEvent(`FAILED: ${e.message}`, 'error');
  await finishRun('failed', { error: e.message });
  process.exit(1);
});
