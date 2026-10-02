#!/usr/bin/env node
/**
 * KEYWORD MINER — "Ask Seeker" chat gaps edition
 *
 * The strongest signal we have: things real visitors asked the site's chat
 * for that we couldn't answer well (no recipe, or only a loose match).
 * api/chat.mjs logs those to `chat_gaps`; this script groups them into
 * search-style phrases ("vegan dessert", "iron-rich vegan breakfast") and
 * writes the ones asked repeatedly to `keyword_candidates` (status='new'),
 * where the draft generator picks them up. Humans still approve every draft.
 *
 * Run:
 *   node pipeline/scripts/keyword-miner-chat.mjs
 *   DRY_RUN=1 node pipeline/scripts/keyword-miner-chat.mjs
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY,
 *      MAX_KEYWORDS_PER_DAY (default 5), CHAT_GAP_DAYS (default 14), CHAT_GAP_MIN_ASKS (default 2)
 */

import './lib/env.mjs';
import { createDb } from './lib/db.mjs';
import { enforceDailyCap, GuardrailError } from './lib/guardrails.mjs';
import { startRun, logEvent, finishRun } from './lib/runlog.mjs';

const DRY_RUN = process.env.DRY_RUN === '1';
const MAX_PER_DAY = Number(process.env.MAX_KEYWORDS_PER_DAY || 5);
const DAYS = Number(process.env.CHAT_GAP_DAYS || 14);
const MIN_ASKS = Number(process.env.CHAT_GAP_MIN_ASKS || 2);
const RUN_ID = 'chat-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

const NUTRIENT_PHRASE = {
  iron: 'iron-rich',
  protein: 'high-protein',
  fiber: 'high-fiber',
  vitaminC: 'vitamin c',
  calcium: 'calcium-rich',
  magnesium: 'magnesium-rich',
  vitaminD: 'vitamin d',
  b12: 'b12',
  zinc: 'zinc-rich',
  folate: 'folate-rich',
  potassium: 'potassium-rich',
  omega3: 'omega-3',
};

// Words that describe a mood, not a topic: never the subject of a keyword.
const VAGUE = new Set(['cozy', 'comfort', 'fun', 'nice', 'light', 'hearty', 'fancy', 'kid', 'kids', 'family', 'cheap', 'budget', 'tonight'])

/** Turn a parsed chat intent into a search-style phrase, or null if too vague. */
export function phraseFor(intent = {}) {
  const nutrients = (intent.nutrients || []).slice(0, 1).map((k) => NUTRIENT_PHRASE[k] || k);
  const diets = (intent.diets || []).slice(0, 1);
  const keywords = (intent.keywords || []).filter((k) => !VAGUE.has(k)).slice(0, 2);
  const meals = (intent.meals || []).slice(0, 1);
  const quick = intent.maxTime && intent.maxTime <= 30 ? ['quick'] : [];
  if (!nutrients.length && !diets.length && !keywords.length && !meals.length) return null;
  const tail = meals.length ? meals : keywords.length ? [] : ['recipes'];
  const words = [...quick, ...nutrients, ...diets, ...keywords, ...tail];
  if (words.length < 2) return null; // "dessert" alone is too broad to write about
  return words.join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

async function main() {
  await startRun('keyword-miner-chat');
  const db = createDb();
  const since = new Date(Date.now() - DAYS * 86_400_000).toISOString();
  const gaps = (await db.select('chat_gaps', `select=intent,reason,created_at&created_at=gte.${since}&limit=5000`)) || [];
  console.log(`[miner-chat] ${gaps.length} chat gaps in the last ${DAYS} days`);

  const counts = new Map();
  for (const g of gaps) {
    const phrase = phraseFor(g.intent);
    if (!phrase) continue;
    const c = counts.get(phrase) || { keyword: phrase, asks: 0, noMatch: 0 };
    c.asks++;
    if (g.reason === 'no_match') c.noMatch++;
    counts.set(phrase, c);
  }

  const existing = (await db.select('keyword_candidates', 'select=keyword')) || [];
  const have = new Set(existing.map((r) => r.keyword.toLowerCase()));
  const candidates = [...counts.values()]
    .filter((c) => c.asks >= MIN_ASKS && !have.has(c.keyword))
    .map((c) => ({ ...c, score: Math.min(100, 50 + c.asks * 8 + c.noMatch * 4) }))
    .sort((a, b) => b.score - a.score);
  console.log(`[miner-chat] ${candidates.length} phrases asked ${MIN_ASKS}+ times and not yet covered`);

  const today = new Date().toISOString().slice(0, 10);
  const alreadyToday = ((await db.select('keyword_candidates', `select=id&created_at=gte.${today}T00:00:00Z`)) || []).length;
  let allowed;
  try {
    allowed = enforceDailyCap(alreadyToday, MAX_PER_DAY, 'keywords');
  } catch (e) {
    if (!(e instanceof GuardrailError)) throw e;
    console.log(`[miner-chat] ${e.message}`);
    await finishRun('ok', { keywords: 0, reason: 'daily-cap' });
    return;
  }
  const picked = candidates.slice(0, allowed);

  if (DRY_RUN) {
    console.log('[miner-chat] DRY_RUN — would write:');
    for (const c of picked) console.log(`  - ${c.keyword} (asked ${c.asks}x, ${c.noMatch} with no match, score ${c.score})`);
    await finishRun('ok', { dry_run: true, keywords: picked.length });
    return;
  }
  if (!picked.length) {
    console.log('[miner-chat] nothing new to write');
    await finishRun('ok', { keywords: 0 });
    return;
  }

  await db.insert(
    'keyword_candidates',
    picked.map((c) => ({ keyword: c.keyword, volume: c.asks, trend_score: null, score: c.score, status: 'new', source_run_id: RUN_ID })),
  );
  await logEvent(`chat miner wrote ${picked.length} keywords from visitor questions: ${picked.map((c) => `${c.keyword} (${c.asks}x)`).join(' | ')}`);
  await finishRun('ok', { keywords: picked.length });
  console.log(`[miner-chat] wrote ${picked.length} keywords`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(async (e) => {
    console.error('[miner-chat] FATAL:', e.message);
    try {
      await finishRun('failed', { reason: e.message });
    } catch {}
    process.exit(1);
  });
}
