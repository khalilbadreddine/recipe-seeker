#!/usr/bin/env node
/**
 * DRAFT GENERATOR — pipeline step 2
 *
 * What it does:
 *   1. Picks up `keyword_candidates` with status='new' (oldest first)
 *   2. Asks an LLM for a full draft: title, meta, lede, category, sections,
 *      FAQs, allergen claims, personal_note, 3 pin title/description variants
 *   3. Flags numeric health claims for MANDATORY human verification
 *   4. Writes the draft with status='pending_review' — nothing downstream
 *      can touch it until a human approves it in the Review Console
 *
 * Guardrails:
 *   - P3: a draft with an empty personal_note is REJECTED (never saved).
 *   - P4: DRAFTS_PER_DAY cap (default 3) — the review queue can never
 *     become a rubber-stamp backlog.
 *   - The LLM is instructed to NEVER invent nutrition numbers; anything
 *     numeric near a health claim is flagged for the reviewer.
 *
 * LLM providers (LLM_PROVIDER):
 *   - "gemini"  (default): Google AI Studio free tier. Needs GEMINI_API_KEY.
 *   - "manual": writes a structured skeleton with TODOs; the human fills
 *     it in the Review Console. Zero cost, zero API key.
 *
 * Run:
 *   LLM_PROVIDER=manual DRY_RUN=1 node pipeline/scripts/draft-generator.mjs
 *   LLM_PROVIDER=gemini node pipeline/scripts/draft-generator.mjs
 */

import { createDb } from './lib/db.mjs';
import { startRun, logEvent, finishRun } from './lib/runlog.mjs';
import {
  GuardrailError,
  enforceDailyCap,
  flagNumericHealthClaims,
  validateNewDraft,
} from './lib/guardrails.mjs';

const DRY_RUN = process.env.DRY_RUN === '1';
const PROVIDER = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
const DRAFTS_PER_DAY = Number(process.env.DRAFTS_PER_DAY || 3);

const SYSTEM_PROMPT = `You write for "The Recipe Seeker", a nutrition-first recipe site.
Positioning: "find recipes by what your body needs" — every post connects a
nutrient (iron, protein, calcium, vitamin C, zinc, fiber...) to real food.

HARD RULES:
1. NEVER invent nutrition numbers. If you are not certain of a per-serving
   number, write the claim WITHOUT numbers (e.g. "a good source of iron").
   Any number you do write MUST be one you are confident about.
2. State allergen/diet claims EXPLICITLY as a list: e.g. ["gluten-free", "dairy-free"].
   Never imply a dish is allergen-free without saying so plainly.
3. personal_note is MANDATORY and must be non-empty: one concrete, personal
   signal — a testing note, a substitution you actually tried, a cooking tip
   from experience. Generic filler ("I love this recipe!") is not acceptable.
4. The post must read like a human food writer, not SEO filler. Short
   paragraphs. Practical. No hype words ("amazing", "incredible", "game-changer").

Return ONLY valid JSON (no markdown fences) with EXACTLY this shape:
{
  "title": "string (<= 70 chars)",
  "description": "string, meta description <= 160 chars",
  "lede": "string, 1-2 sentence opener",
  "category": "one of: Iron, Protein, Calcium, Vitamin C, Zinc, Fiber, Meal Prep, Breakfast",
  "sections": [ { "h2": "string", "paragraphs": ["string", "..."] } ],   // 3-5 sections
  "faqs": [ { "q": "string", "a": "string" } ],                          // 3-5 FAQs
  "allergen_claims": ["gluten-free", "dairy-free"],
  "personal_note": "string, REQUIRED, concrete and personal",
  "pin_variants": [
    { "title": "string <= 100 chars", "description": "string <= 450 chars" },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." }
  ]
}`;

async function generateWithGemini(keyword) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('LLM_PROVIDER=gemini needs GEMINI_API_KEY (free at Google AI Studio)');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: `Write the blog post for the keyword: "${keyword}"` }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  const clean = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(clean);
}

function generateManual(keyword) {
  // Zero-cost skeleton: the human writes the post in the Review Console.
  return {
    title: `TODO title for: ${keyword}`,
    description: 'TODO: meta description (<= 160 chars)',
    lede: 'TODO: 1-2 sentence opener',
    category: 'Meal Prep',
    sections: [{ h2: 'TODO: section heading', paragraphs: ['TODO: write this section.'] }],
    faqs: [{ q: 'TODO: question', a: 'TODO: answer' }],
    allergen_claims: [],
    personal_note: 'TODO: REQUIRED — one concrete personal signal (testing note, substitution you tried, tip from experience). The draft CANNOT be published until this is filled in.',
    pin_variants: [{ title: `TODO pin title for ${keyword}`, description: 'TODO pin description' }],
    _manual: true,
  };
}

async function main() {
  await startRun('generator');
  const db = DRY_RUN ? null : createDb();

  let alreadyToday = 0;
  if (!DRY_RUN) {
    alreadyToday = await db.countToday('drafts');
    try {
      enforceDailyCap(alreadyToday, DRAFTS_PER_DAY, 'draft generator');
    } catch (e) {
      console.log(`[drafts] ${e.message}`);
      await logEvent(`Stopped: ${e.message}`, 'warn');
      await finishRun('ok', { drafts: 0, reason: 'daily cap reached' });
      return;
    }
  }
  const remaining = DRAFTS_PER_DAY - alreadyToday;

  let candidates;
  if (DRY_RUN) {
    console.log('[drafts] DRY_RUN=1 — using a fake keyword, no LLM/DB calls');
    candidates = [{ id: 'dry-run-id', keyword: 'high protein overnight oats' }];
  } else {
    candidates = await db.select(
      'keyword_candidates',
      'select=id,keyword&status=eq.new&order=created_at.asc&limit=' + remaining
    );
  }
  if (candidates.length === 0) {
    console.log('[drafts] no new keyword candidates — run the keyword miner first');
    await finishRun('ok', { drafts: 0, reason: 'no candidates' });
    return;
  }
  console.log(`[drafts] generating ${candidates.length} draft(s) via provider "${PROVIDER}"`);
  await logEvent(`Generating ${candidates.length} draft(s) via provider "${PROVIDER}"`);

  let created = 0;
  for (const cand of candidates) {
    console.log(`[drafts] keyword: "${cand.keyword}"`);
    let gen;
    try {
      gen = PROVIDER === 'manual' ? generateManual(cand.keyword) : await generateWithGemini(cand.keyword);
    } catch (e) {
      console.error(`[drafts] generation failed for "${cand.keyword}": ${e.message} — leaving candidate as 'new'`);
      continue;
    }

    const bodyText = JSON.stringify(gen.sections) + ' ' + JSON.stringify(gen.faqs);
    const flagged = flagNumericHealthClaims(gen.title + ' ' + gen.lede + ' ' + bodyText);
    if (flagged.length > 0) {
      console.log(`[drafts] flagged ${flagged.length} numeric claim(s) for human verification:`);
      for (const f of flagged.slice(0, 5)) console.log(`    ! ${f.claim} — "...${f.context.slice(0, 90)}..."`);
      await logEvent(`Draft "${gen.title}" ready — ${flagged.length} numeric claim(s) flagged for your check`, 'warn');
    } else {
      await logEvent(`Draft ready: "${gen.title}"`);
    }

    const draft = {
      keyword_id: DRY_RUN ? null : cand.id,
      title: gen.title,
      description: gen.description,
      lede: gen.lede,
      category: gen.category,
      image: '',
      body: { sections: gen.sections, faqs: gen.faqs },
      allergen_claims: gen.allergen_claims || [],
      flagged_claims: flagged,
      personal_note: gen.personal_note,
      pin_variants: gen.pin_variants,
      status: 'pending_review',
    };

    // P3 — the generator may not skip the personal note. Ever.
    const problems = validateNewDraft(draft);
    if (problems.length > 0) {
      // Manual skeletons are allowed through ONLY because the reviewer must
      // fill the TODOs; everything else is rejected.
      const onlyTodos = gen._manual && problems.every((p) => p.includes('personal_note') || p.includes('pin_variants'));
      if (!onlyTodos) {
        console.error(`[drafts] P3 REJECTED draft for "${cand.keyword}": ${problems.join('; ')}`);
        continue;
      }
      console.log(`[drafts] manual skeleton for "${cand.keyword}" — reviewer must complete TODOs before approval`);
    }

    if (DRY_RUN) {
      console.log('[drafts] DRY_RUN — draft NOT saved. Sample:', JSON.stringify(draft).slice(0, 200) + '...');
      continue;
    }

    const [saved] = await db.insert('drafts', draft);
    await db.update('keyword_candidates', `id=eq.${cand.id}`, { status: 'drafted' });
    console.log(`[drafts] saved as pending_review: ${saved.id} (candidate marked drafted)`);
    created++;
  }
  console.log('[drafts] done');
  await logEvent(`Done — ${created} draft(s) awaiting your review`);
  await finishRun('ok', { drafts: created });
}

main().catch(async (e) => {
  if (e instanceof GuardrailError) console.error('[drafts] GUARDRAIL:', e.message);
  else console.error('[drafts] FAILED:', e.message);
  await logEvent(`FAILED: ${e.message}`, 'error');
  await finishRun('failed', { error: e.message });
  process.exit(1);
});
