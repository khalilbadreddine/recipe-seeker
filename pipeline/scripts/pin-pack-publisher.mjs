#!/usr/bin/env node
/**
 * PIN-PACK PUBLISHER — posts the daily finished-pin pack to Pinterest via API v5.
 *
 * Built for Khalil's 2026-10-06 request: Neo pushes the finished daily pins
 * (real Pexels/Unsplash photos + full brand design) straight to his Pinterest
 * boards, so he only reviews. Replaces manual posting once Pinterest Standard
 * access is granted (trial/sandbox tokens create creator-only invisible pins).
 *
 * Input: a day dir, e.g. ~/workspace/your_files/pinterest-packs/day4/
 *   finished/          finished 1000x1500 PNGs (the actual pin creative)
 *   manifest.json      array of { file, title, description, link, board? }
 *   posted.json        written by this script (pin ids, skipped on rerun)
 *
 * The morning operator run must write manifest.json alongside the finished
 * PNGs — exact approved titles/descriptions/links, NOT reconstructed from
 * memory. Never fabricate manifest copy.
 *
 * Env (repo-root .env or pipeline/.env, see lib/env.mjs):
 *   PINTEREST_ACCESS_TOKEN   user token from the Pinterest dev dashboard
 *   PINTEREST_API_BASE       'https://api-sandbox.pinterest.com/v5' for trial,
 *                            'https://api.pinterest.com/v5' for production
 *                            (defaults to production)
 *   PINTEREST_BOARD_ID       default board when a manifest row omits `board`
 *   PIN_SPACING_HOURS        default 6 — pins go out spaced through the day
 *
 * Run:
 *   node pipeline/scripts/pin-pack-publisher.mjs <day-dir> --dry-run
 *   node pipeline/scripts/pin-pack-publisher.mjs <day-dir> --boards   # list boards
 *   node pipeline/scripts/pin-pack-publisher.mjs <day-dir>            # post
 *   node pipeline/scripts/pin-pack-publisher.mjs <day-dir> --immediate  # no publish_at spacing
 *
 * Notes:
 * - Media uploads use image_base64 (files are local; no public URL needed).
 *   Max 32MB per image; finished pins are ~1.5MB.
 * - Trial access: pins are SANDBOX-ONLY, invisible to everyone but the
 *   creator. The script prints a loud banner so nobody mistakes a 201
 *   response for a live pin.
 * - publish_at must be a future UTC ISO string. If Pinterest rejects it, we
 *   retry the same pin as immediate.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import './lib/env.mjs';
import { createPinterest } from './lib/pinterest.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const LIST_BOARDS = process.argv.includes('--boards');
const IMMEDIATE = process.argv.includes('--immediate');
const SPACING_HOURS = Number(process.env.PIN_SPACING_HOURS || 6);
const API_BASE = (process.env.PINTEREST_API_BASE || 'https://api.pinterest.com/v5');
const IS_SANDBOX = API_BASE.includes('-sandbox');
const MAX_BYTES = 32 * 1024 * 1024;

function fail(msg) {
  console.error(`[pin-pack] FATAL: ${msg}`);
  process.exit(1);
}

async function main() {
  if (IS_SANDBOX) {
    console.log('');
    console.log('!!! SANDBOX MODE !!! Pins created now are visible ONLY to the token owner.');
    console.log('!!! SANDBOX MODE !!! They will NOT appear on the public profile. Standard access is required for live pins.');
    console.log('');
  }

  const pin = createPinterest();

  if (LIST_BOARDS) {
    const boards = await pin.boards();
    const items = boards.items || boards || [];
    console.log('Your boards:');
    for (const b of items) console.log(`  - ${b.name}  ->  ${b.id} (${b.privacy || '?'})`);
    return;
  }

  const dayDir = process.argv[2];
  if (!dayDir || !existsSync(dayDir)) fail('pass the day dir, e.g. pin-pack-publisher.mjs ~/workspace/your_files/pinterest-packs/day4');

  const manifestPath = join(dayDir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    fail(`no manifest.json in ${dayDir}. The morning operator run must write it: [{ file, title, description, link, board? }]. Never fabricate the copy.`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(manifest) || manifest.length === 0) fail('manifest.json is empty or not an array');

  const postedPath = join(dayDir, 'posted.json');
  const posted = existsSync(postedPath) ? JSON.parse(readFileSync(postedPath, 'utf8')) : {};
  const defaultBoard = process.env.PINTEREST_BOARD_ID;

  let queued = 0;
  for (const row of manifest) {
    if (posted[row.file]?.pin_id) {
      console.log(`[pin-pack] skip ${row.file} — already posted as ${posted[row.file].pin_id}`);
      continue;
    }
    const filePath = join(dayDir, 'finished', basename(row.file));
    if (!existsSync(filePath)) fail(`missing image: ${filePath}`);
    const size = statSync(filePath).size;
    if (size > MAX_BYTES) fail(`${row.file} is ${(size / 1048576).toFixed(1)}MB — Pinterest max is 32MB`);
    if (!row.title || !row.description || !row.link) fail(`${row.file}: manifest row needs title, description and link`);
    const board = row.board || defaultBoard;
    if (!board) fail(`${row.file}: no board — set row.board or PINTEREST_BOARD_ID`);

    const publishAt = IMMEDIATE
      ? null
      : new Date(Date.now() + queued * SPACING_HOURS * 3600 * 1000).toISOString();

    const payload = {
      board_id: board,
      title: row.title,
      description: row.description,
      link: row.link,
      alt_text: row.title,
      media_source: {
        source_type: 'image_base64',
        content_type: 'image/png',
        data: readFileSync(filePath).toString('base64'),
      },
      ...(publishAt ? { publish_at: publishAt } : {}),
    };

    if (DRY_RUN) {
      console.log(`[pin-pack][dry-run] would post ${row.file} (${(size / 1024).toFixed(0)}KB) -> board ${board}${publishAt ? ` at ${publishAt}` : ' immediately'}`);
      console.log(`             title: ${row.title}`);
      console.log(`             link:  ${row.link}`);
      queued++;
      continue;
    }

    try {
      const res = await pin.createPin(payload);
      posted[row.file] = { pin_id: res.id, board, title: row.title, link: row.link, publish_at: publishAt, posted_at: new Date().toISOString(), sandbox: IS_SANDBOX };
      console.log(`[pin-pack] posted ${row.file} -> pin ${res.id}${publishAt ? ` (scheduled ${publishAt})` : ''}`);
    } catch (e) {
      if (/publish_at/i.test(e.message) && publishAt) {
        console.log(`[pin-pack] Pinterest rejected publish_at for ${row.file} — retrying as immediate`);
        delete payload.publish_at;
        const res = await pin.createPin(payload);
        posted[row.file] = { pin_id: res.id, board, title: row.title, link: row.link, publish_at: null, posted_at: new Date().toISOString(), sandbox: IS_SANDBOX };
        console.log(`[pin-pack] posted ${row.file} -> pin ${res.id} (immediate)`);
      } else {
        fail(`${row.file}: ${e.message}`);
      }
    }
    queued++;
  }

  if (!DRY_RUN) writeFileSync(postedPath, JSON.stringify(posted, null, 2) + '\n');
  console.log(`[pin-pack] done: ${queued} pin(s)${DRY_RUN ? ' (dry run)' : ''}${IS_SANDBOX ? ' — SANDBOX ONLY, not visible publicly' : ''}`);
}

main().catch((e) => fail(e.message));
