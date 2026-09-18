#!/usr/bin/env node
/**
 * KEYWORD MINER — pipeline step 1
 *
 * What it does:
 *   1. Pulls trending food keywords from Pinterest API v5
 *      (GET /trends/keywords/{region}/top/{trend_type})
 *   2. Scores each keyword (trend strength + content gap + niche fit)
 *   3. Skips anything the site already covers (recipes.json posts + recipes)
 *   4. Writes the top N to `keyword_candidates` with status='new'
 *
 * Guardrails:
 *   - Daily cap (MAX_KEYWORDS_PER_DAY, default 5) — enforced BEFORE writing.
 *   - DRY_RUN=1 prints what WOULD happen without touching the API or DB.
 *
 * Run:
 *   node pipeline/scripts/keyword-miner.mjs
 *   DRY_RUN=1 node pipeline/scripts/keyword-miner.mjs
 *
 * Env (see pipeline/.env.example):
 *   PINTEREST_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY,
 *   PINTEREST_REGION (default US), PINTEREST_TREND_TYPE (default growing),
 *   MAX_KEYWORDS_PER_DAY (default 5)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createDb } from './lib/db.mjs';
import { enforceDailyCap, scoreKeyword } from './lib/guardrails.mjs';
import { createPinterest, extractTrendKeywords } from './lib/pinterest.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
import { startRun, logEvent, finishRun } from './lib/runlog.mjs';

const DRY_RUN = process.env.DRY_RUN === '1';
const MAX_PER_DAY = Number(process.env.MAX_KEYWORDS_PER_DAY || 5);
const REGION = process.env.PINTEREST_REGION || 'US';
const TREND_TYPE = process.env.PINTEREST_TREND_TYPE || 'growing';
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

// Sample trends used in DRY_RUN (shape-agnostic — exercises the whole flow).
const SAMPLE_TRENDS = {
  trends: [
    { keyword: 'high protein overnight oats', score: 92 },
    { keyword: 'iron rich vegetarian meals', score: 88 },
    { keyword: 'dairy free creamy pasta', score: 81 },
    { keyword: 'salmon kale pesto pasta', score: 77 }, // already on the site -> must be skipped
    { keyword: 'zinc rich snacks for kids', score: 74 },
    { keyword: 'meal prep for night shift', score: 69 },
  ],
};

function existingTopics() {
  const data = JSON.parse(readFileSync(join(ROOT, 'client', 'src', 'data', 'recipes.json'), 'utf8'));
  const topics = [];
  for (const r of [...(data.recipes || []), ...(data.posts || [])]) {
    if (r.slug) topics.push(r.slug.replace(/-/g, ' '));
    if (r.title) topics.push(r.title);
    if (r.category) topics.push(r.category);
  }
  return topics;
}

async function main() {
  await startRun('miner');
  const topics = existingTopics();
  console.log(`[miner] site already covers ${topics.length} topics (dedupe base)`);

  let raw;
  if (DRY_RUN) {
    console.log('[miner] DRY_RUN=1 — using sample trends, no Pinterest/DB calls');
    raw = SAMPLE_TRENDS;
  } else {
    const pin = createPinterest();
    console.log(`[miner] fetching trends: region=${REGION} type=${TREND_TYPE}`);
    raw = await pin.trendingKeywords({ region: REGION, trendType: TREND_TYPE, limit: 25 });
  }

  const trends = extractTrendKeywords(raw);
  console.log(`[miner] got ${trends.length} trend keywords`);
  await logEvent(`Run started · region ${REGION} · ${trends.length} trend keywords fetched`);

  // score + drop already-covered topics
  const skipped = [];
  const scored = trends
    .map((t) => ({ ...t, ...scoreKeyword(t.keyword, t.trendScore, topics) }))
    .filter((t) => {
      if (t.covered) {
        console.log(`[miner] skip (already covered): "${t.keyword}"`);
        skipped.push(t.keyword);
        return false;
      }
      return true;
    })
    .sort((a, b) => b.score - a.score);
  if (skipped.length > 0) await logEvent(`Skipped ${skipped.length} (already on site): ${skipped.join('; ')}`);

  if (scored.length === 0) {
    console.log('[miner] nothing new to add — done');
    await finishRun('ok', { written: 0, reason: 'nothing new' });
    return;
  }

  const db = DRY_RUN ? null : createDb();
  let alreadyToday = 0;
  if (!DRY_RUN) {
    alreadyToday = await db.countToday('keyword_candidates');
    const existing = await db.select('keyword_candidates', 'select=keyword&status=eq.new');
    const seenKw = new Set(existing.map((r) => r.keyword.toLowerCase()));
    for (const t of scored) {
      if (seenKw.has(t.keyword.toLowerCase())) {
        console.log(`[miner] skip (already queued): "${t.keyword}"`);
        t._dup = true;
      }
    }
  }
  const fresh = scored.filter((t) => !t._dup && !t.covered);

  let remaining;
  try {
    remaining = DRY_RUN ? MAX_PER_DAY : enforceDailyCap(alreadyToday, MAX_PER_DAY, 'keyword miner');
  } catch (e) {
    console.log(`[miner] ${e.message}`);
    await logEvent(`Stopped: ${e.message}`, 'warn');
    await finishRun('ok', { written: 0, reason: 'daily cap reached' });
    return;
  }

  const batch = fresh.slice(0, remaining);
  console.log(`[miner] writing ${batch.length} candidates (cap: ${alreadyToday}/${MAX_PER_DAY} used today)`);
  for (const t of batch) {
    console.log(`  + "${t.keyword}" (score ${t.score}, trend ${t.trendScore})`);
  }

  if (DRY_RUN) {
    console.log('[miner] DRY_RUN — nothing written. Remove DRY_RUN=1 to go live.');
    return;
  }

  const rows = batch.map((t) => ({
    keyword: t.keyword,
    trend_score: t.trendScore,
    score: t.score,
    status: 'new',
    source_run_id: RUN_ID,
  }));
  if (rows.length > 0) await db.insert('keyword_candidates', rows);
  console.log(`[miner] done — run id ${RUN_ID}`);
  await logEvent(`Wrote ${rows.length} keyword candidates (top: "${batch[0]?.keyword || '—'}")`);
  await finishRun('ok', { written: rows.length });
}

main().catch(async (e) => {
  console.error('[miner] FAILED:', e.message);
  await logEvent(`FAILED: ${e.message}`, 'error');
  await finishRun('failed', { error: e.message });
  process.exit(1);
});
