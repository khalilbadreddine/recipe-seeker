/**
 * Pipeline guardrails as PURE functions (no network, no DB).
 * The same rules are ALSO enforced at the DB layer (triggers + CHECK
 * constraints in pipeline/supabase/schema-pipeline.sql). These functions
 * are what the scripts call, and what the test suite asserts.
 *
 * Rule summary:
 *  P1: publish requires status='approved' + human-written personal_note
 *      (no TODO_KHALIL placeholder) + image + empty live_url
 *  P2: pin creation requires status='published' + live_url set
 *  P3: new drafts require a personal_note; the LLM/agent may never invent
 *      experience — without a real supplied note it must emit TODO_KHALIL
 *  P4: daily caps are enforced before miner/generator write anything
 */

export class GuardrailError extends Error {
  constructor(rule, message) {
    super(`[${rule}] ${message}`);
    this.rule = rule;
  }
}

/** P1 — called by the Publisher before a draft may become a blog post. */
export function assertPublishable(draft) {
  if (!draft) throw new GuardrailError('P1', 'draft is missing');
  if (draft.status !== 'approved') {
    throw new GuardrailError('P1', `refusing to publish: status is '${draft.status}', need 'approved'`);
  }
  if (!draft.personal_note || !draft.personal_note.trim()) {
    throw new GuardrailError('P1', 'refusing to publish: personal_note is empty (human signal required)');
  }
  if (draft.personal_note.includes('TODO_KHALIL')) {
    throw new GuardrailError('P1', 'refusing to publish: personal_note is still the placeholder — Khalil must write his own note first');
  }
  if (!draft.image || !draft.image.trim()) {
    throw new GuardrailError('P1', 'refusing to publish: image path is empty (pins need a hero image)');
  }
  if (draft.live_url) {
    throw new GuardrailError('P1', `refusing to publish: already published at ${draft.live_url}`);
  }
  if (!draft.title || !draft.title.trim()) {
    throw new GuardrailError('P1', 'refusing to publish: title is empty');
  }
  const sections = draft.body?.sections;
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new GuardrailError('P1', 'refusing to publish: body has no sections');
  }
  return true;
}

/** P2 — called by the Pin Scheduler before a pin may be created. */
export function assertPinCreatable(draft) {
  if (!draft) throw new GuardrailError('P2', 'draft is missing');
  if (draft.status !== 'published') {
    throw new GuardrailError('P2', `refusing to create pin: status is '${draft.status}', need 'published'`);
  }
  if (!draft.live_url) {
    throw new GuardrailError('P2', 'refusing to create pin: live_url is missing (publisher must confirm first)');
  }
  if (!draft.image) {
    throw new GuardrailError('P2', 'refusing to create pin: no hero image on the draft');
  }
  return true;
}

/** P3 — called by the Draft Generator before a draft may be saved. */
export function validateNewDraft(draft) {
  const problems = [];
  if (!draft.title?.trim()) problems.push('title is empty');
  if (!draft.personal_note?.trim()) problems.push('personal_note is empty (P3: the generator may not skip it)');
  const sections = draft.body?.sections;
  if (!Array.isArray(sections) || sections.length === 0) problems.push('body has no sections');
  if (!Array.isArray(draft.pin_variants) || draft.pin_variants.length < 1) {
    problems.push('pin_variants is missing (need at least 1)');
  }
  return problems;
}

/** P4 — daily caps. Throws when the cap is reached. */
export function enforceDailyCap(countToday, max, label) {
  if (countToday >= max) {
    throw new GuardrailError('P4', `${label}: daily cap reached (${countToday}/${max}) — stopping`);
  }
  return max - countToday; // remaining slots
}

/**
 * Flags numeric health claims that a human MUST verify before approving.
 * Matches numbers+units (25g protein, 8mg iron, 30%, 200kcal) near
 * nutrition/health words, and returns [{ claim, context }].
 */
export function flagNumericHealthClaims(text) {
  if (!text) return [];
  const findings = [];
  const unitRe = /(\d+(?:[.,]\d+)?\s?(?:mg|g|kg|mcg|µg|iu|kcal|cal|%|percent))/gi;
  const healthRe =
    /(iron|protein|calcium|vitamin|fiber|fibre|zinc|magnesium|potassium|sodium|folate|omega|cholesterol|sugar|carb|fat|reduce|lower|boost|increase|prevent|improve|absorb|deficien)/i;
  let m;
  while ((m = unitRe.exec(text)) !== null) {
    const start = Math.max(0, m.index - 80);
    const context = text.slice(start, m.index + m[0].length + 80).replace(/\s+/g, ' ').trim();
    if (healthRe.test(context)) {
      findings.push({ claim: m[0].trim(), context });
    }
    if (findings.length >= 25) break;
  }
  // de-dupe by claim text
  const seen = new Set();
  return findings.filter((f) => {
    const k = f.claim.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Scores a keyword candidate. Higher = better.
 * - trendScore: 0..100 from Pinterest (weight 0.5)
 * - gapBonus: 30 if no existing content covers it (weight via addition)
 * - nicheBonus: 20 if it matches the site's nutrition/allergen niche
 */
const NICHE_WORDS =
  /(iron|protein|calcium|vitamin|fiber|fibre|zinc|folate|magnesium|potassium|gluten.?free|dairy.?free|vegan|vegetarian|high.?protein|low.?carb|meal.?prep|breakfast|lunch|dinner|snack)/i;

const STOPWORDS = new Set([
  'for', 'the', 'a', 'an', 'and', 'with', 'ideas', 'idea',
  'recipes', 'recipe', 'how', 'to', 'best', 'easy', 'simple',
]);

/** Significant words of a topic string (lowercased, de-punctuated). */
export function topicWords(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Conservative duplicate detection: is this keyword already covered?
 * Covered only when a topic contains EVERY significant word of the keyword,
 * or the keyword swallows a whole multi-word (3+) topic phrase.
 * Single generic words (a "Protein" category vs "quinoa protein bowls")
 * deliberately do NOT count — otherwise the miner would starve.
 */
export function isCoveredByTopics(keyword, existingTopics) {
  const kw = topicWords(keyword);
  if (kw.length === 0) return false;
  return existingTopics.some((t) => {
    const tw = topicWords(t);
    if (tw.length === 0) return false;
    if (kw.every((w) => tw.includes(w))) return true;
    if (tw.length >= 3 && tw.every((w) => kw.includes(w))) return true;
    return false;
  });
}

export function scoreKeyword(keyword, trendScore, existingTopics) {
  const covered = isCoveredByTopics(keyword, existingTopics);
  const gapBonus = covered ? 0 : 30;
  const nicheBonus = NICHE_WORDS.test(keyword) ? 20 : 0;
  const score = Math.round((trendScore || 0) * 0.5 + gapBonus + nicheBonus);
  return { score, covered };
}

/** Slugify a title the same way the site's existing slugs look. */
export function slugify(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
