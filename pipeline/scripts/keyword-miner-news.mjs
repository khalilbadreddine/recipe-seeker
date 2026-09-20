#!/usr/bin/env node
/**
 * KEYWORD MINER (BACKUP) — Google News RSS edition
 *
 * Why this exists: the primary miner (keyword-miner.mjs) pulls trends from the
 * Pinterest API, which needs trial approval and is rate-limited. This backup
 * needs NO api key and NO approval — it reads Google News RSS (US) for
 * nutrition-first queries, extracts the phrases publishers are actually
 * writing about RIGHT NOW, and writes the best ones to `keyword_candidates`
 * with status='new'.
 *
 * Signal: what food media is publishing this week ~ what readers will search
 * and pin next. Not as direct as Pinterest Trends, but keyless, unblockable,
 * and honest about what it measures.
 *
 * Run:
 *   node pipeline/scripts/keyword-miner-news.mjs
 *   DRY_RUN=1 node pipeline/scripts/keyword-miner-news.mjs
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, MAX_KEYWORDS_PER_DAY (default 5)
 */

import './lib/env.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createDb } from './lib/db.mjs';
import { enforceDailyCap, scoreKeyword } from './lib/guardrails.mjs';
import { startRun, logEvent, finishRun } from './lib/runlog.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DRY_RUN = process.env.DRY_RUN === '1';
const MAX_PER_DAY = Number(process.env.MAX_KEYWORDS_PER_DAY || 5);
const RUN_ID = 'news-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

// Nutrition-first angles — the site's positioning, not generic recipes.
const QUERIES = [
  'high protein recipes',
  'iron rich foods',
  'high fiber meals',
  'healthy meal prep',
  'low calorie dinners',
  'gut health foods',
  'anti inflammatory diet',
  'magnesium rich foods',
  'healthy snacks',
  'high protein breakfast',
];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// A candidate phrase must contain at least one of these to be food-relevant.
const FOOD_WORDS =
  /\b(protein|fiber|fibre|iron|calcium|magnesium|zinc|vitamin|gut|keto|vegan|vegetarian|plant|dinner|dinners|lunch|lunches|breakfast|snack|snacks|meal|meals|recipe|recipes|cooking|bake|baking|oats|oatmeal|salad|soup|pasta|chicken|salmon|tuna|beef|lentil|bean|chickpea|quinoa|avocado|egg|eggs|yogurt|smoothie|bowl|curry|stir fry|air fryer|sheet pan|one pot|slow cooker|diet|calorie|calories|low carb|sugar free|gluten free|dairy free|healthy|nutrition|dietitian|superfood|fermented|probiotic|hydration|breakfasts)\b/i;

// Phrases that are listicle glue, not topics.
const JUNK_PHRASE =
  /^(easy|best|top|new|simple|quick|delicious|tasty|perfect|ultimate|easy weeknight|these|those|what|why|how|this|that|with|for|our|your|my)\b/i;

// Words that only appear because a stopword was stripped mid-title
// ("created by dietitians" -> "created dietitian"). Never a real topic.
const GLUE_WORD =
  /\b(created|says|said|according|rely|relies|taste|tastes|last|lasting|look|looks|need|needs|want|wants|make|makes|made|take|takes|keep|keeps|help|helps|packed|pack|follow|following|avoid|eat|eating|least)\b/;

// Publisher names leak into titles ("... - eatingwell.com"); never a topic.
const SOURCE_WORD =
  /\b(eatingwell|real simple|realsimple|pioneer woman|allrecipes|food network|healthline|verywell|bon appetit|epicurious|taste of home|delish|kitchn|health\.com|prevention)\b/;

// Too generic to write a differentiated article about.
const GENERIC = /^(dinners?|lunch(es)?|breakfasts?|snacks?|meals?|recipes?|dishes?|foods?|ideas?)(\s+(recipes?|ideas?|meals?|dishes?))?$/;

const STOP = new Set(
  'a,an,the,and,or,of,to,in,on,for,with,that,this,these,those,is,are,was,were,be,been,by,from,as,at,it,its,you,your,we,our,they,their,he,she,his,her,not,no,yes,do,does,did,will,would,can,could,should,than,then,so,such,into,out,up,down,over,under,again,once,here,there,when,where,why,how,all,any,both,each,few,more,most,other,some,only,own,same,too,very,just,about,like,than,every'.split(',')
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

async function fetchTitles(query) {
  const url =
    'https://news.google.com/rss/search?q=' +
    encodeURIComponent(query) +
    '&hl=en-US&gl=US&ceid=US:en';
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`news rss -> ${res.status}`);
  const xml = await res.text();
  const titles = [];
  const re = /<title>([\s\S]*?)<\/title>/g;
  let m;
  let first = true;
  while ((m = re.exec(xml))) {
    if (first) { first = false; continue; } // skip feed title
    if (m[1].includes('Google News')) continue;
    titles.push(decodeEntities(m[1]).trim());
  }
  return titles;
}

/** "20 High-Fiber Dinners with at Least 20 Grams of Protein - eatingwell.com"
 *  -> "high fiber dinners with at least 20 grams of protein" */
function cleanTitle(t) {
  return t
    .replace(/\s*-\s*[a-z0-9.-]+\.(com|net|org|io)\s*$/i, '') // strip " - source.com"
    .replace(/^\d+\s+/, '') // strip leading listicle number
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Emit 2–4 word shingles from a cleaned title. */
function shingles(cleaned) {
  const words = cleaned.split(' ').filter((w) => w && !STOP.has(w) && w.length > 1);
  const out = [];
  for (let n = 2; n <= 4; n++) {
    for (let i = 0; i + n <= words.length; i++) {
      const phrase = words.slice(i, i + n).join(' ');
      if (phrase.length < 8 || phrase.length > 48) continue;
      if (JUNK_PHRASE.test(phrase)) continue;
      if (GLUE_WORD.test(phrase)) continue;
      if (SOURCE_WORD.test(phrase)) continue;
      if (GENERIC.test(phrase)) continue;
      if (/^(\w+ )?\w*weight$/.test(phrase) && phrase.split(' ').length < 3) continue; // "dinners weight"
      if (!FOOD_WORDS.test(phrase)) continue;
      // skip echoes of our own seed queries ("healthy snacks" <- query "healthy snacks")
      if (QUERIES.some((q) => q.includes(phrase))) continue;
      out.push(phrase);
    }
  }
  return out;
}

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
  await startRun('miner-news');
  const topics = existingTopics();
  console.log(`[miner-news] site already covers ${topics.length} topics (dedupe base)`);

  const freq = new Map(); // phrase -> {count, queries:Set}
  let titleCount = 0;

  for (const q of QUERIES) {
    try {
      const titles = await fetchTitles(q);
      titleCount += titles.length;
      console.log(`[miner-news] "${q}" -> ${titles.length} articles`);
      for (const t of titles) {
        for (const s of shingles(cleanTitle(t))) {
          const e = freq.get(s) || { count: 0, queries: new Set() };
          e.count++;
          e.queries.add(q);
          freq.set(s, e);
        }
      }
    } catch (e) {
      console.log(`[miner-news] query "${q}" failed: ${e.message}`);
      await logEvent(`news miner query "${q}" failed: ${e.message}`, 'warn');
    }
    await sleep(1500);
  }

  console.log(`[miner-news] ${titleCount} article titles, ${freq.size} raw phrases`);

  const maxFreq = Math.max(1, ...[...freq.values()].map((e) => e.count));
  const candidates = [];
  for (const [phrase, e] of freq) {
    if (e.count < 2 && e.queries.size < 2) continue; // needs corroboration
    if (phrase.split(' ').length < 3 && e.count < 6) continue; // 2-word phrases: higher bar
    const trend = Math.round((e.count / maxFreq) * 90) + 5; // 5..95
    const { score: base, covered } = scoreKeyword(phrase, trend, topics);
    if (covered || base < 40) continue;
    // normalize "dinners weight loss" -> "weight loss dinners" (stopword stripped "for")
    const keyword = phrase.replace(/^(dinners?) (.+)$/, '$2 $1');
    const score = base + (keyword.split(' ').length >= 3 ? 10 : 0); // specificity bonus
    candidates.push({ keyword, trend_score: trend, score, mentions: e.count });
  }
  candidates.sort((a, b) => b.score - a.score);
  console.log(`[miner-news] ${candidates.length} scored candidates`);

  const db = DRY_RUN ? null : createDb();
  let alreadyToday = 0;
  if (!DRY_RUN) {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db.select('keyword_candidates', `select=id&created_at=gte.${today}T00:00:00Z`);
    alreadyToday = (rows || []).length;
    const existing = await db.select('keyword_candidates', 'select=keyword');
    const have = new Set((existing || []).map((r) => r.keyword.toLowerCase()));
    for (let i = candidates.length - 1; i >= 0; i--) {
      if (have.has(candidates[i].keyword)) candidates.splice(i, 1);
    }
  }

  const allowed = enforceDailyCap(alreadyToday, MAX_PER_DAY, 'keywords');
  const picked = candidates.slice(0, allowed);

  if (DRY_RUN) {
    console.log('[miner-news] DRY_RUN — would write:');
    for (const c of picked)
      console.log(`  - ${c.keyword} (score ${c.score}, trend ${c.trend_score}, ${c.mentions} mentions)`);
    await finishRun('ok', { dry_run: true, keywords: picked.length });
    return;
  }

  if (picked.length === 0) {
    console.log('[miner-news] nothing new to write (cap reached or all covered)');
    await finishRun('ok', { keywords: 0, reason: 'cap-or-covered' });
    return;
  }

  await db.insert(
    'keyword_candidates',
    picked.map((c) => ({
      keyword: c.keyword,
      volume: null,
      trend_score: c.trend_score,
      score: c.score,
      status: 'new',
      source_run_id: RUN_ID,
    }))
  );
  await logEvent(`news miner wrote ${picked.length} keywords: ${picked.map((c) => c.keyword).join(' | ')}`);
  await finishRun('ok', { keywords: picked.length });
  console.log(`[miner-news] wrote ${picked.length} keywords`);
}

main().catch(async (e) => {
  console.error('[miner-news] FATAL:', e.message);
  try {
    await finishRun('failed', { reason: e.message });
  } catch {}
  process.exit(1);
});
