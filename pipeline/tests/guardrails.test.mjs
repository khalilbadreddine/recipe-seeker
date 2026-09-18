/**
 * Guardrail tests — run with:  node --test pipeline/tests/
 *
 * These prove the product's hard rules hold, using the same pure functions
 * the scripts call:
 *   P1: nothing publishes unless status='approved' + personal_note + image
 *   P2: no pin without status='published' + live_url
 *   P3: the generator cannot save a draft with an empty personal_note
 *   P4: daily caps stop the miner/generator before they write
 *   + numeric health-claim flagging works
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GuardrailError,
  assertPublishable,
  assertPinCreatable,
  validateNewDraft,
  enforceDailyCap,
  flagNumericHealthClaims,
  isCoveredByTopics,
  scoreKeyword,
  slugify,
} from '../scripts/lib/guardrails.mjs';

const approvedDraft = () => ({
  title: 'Iron-Rich Lentil Bowls',
  description: 'meta',
  lede: 'lede',
  category: 'Iron',
  image: '/images/lentil-bowls.webp',
  body: { sections: [{ h2: 'Why', paragraphs: ['Because.'] }], faqs: [] },
  personal_note: 'I tested this with brown lentils; red ones turn to mush.',
  pin_variants: [{ title: 't', description: 'd' }],
  status: 'approved',
  live_url: null,
});

describe('P1 — publisher guardrail', () => {
  it('publishes a proper approved draft', () => {
    assert.equal(assertPublishable(approvedDraft()), true);
  });

  it('REFUSES a pending_review draft (the core rule)', () => {
    const d = approvedDraft();
    d.status = 'pending_review';
    assert.throws(() => assertPublishable(d), GuardrailError);
  });

  it('REFUSES when personal_note is empty', () => {
    const d = approvedDraft();
    d.personal_note = '   ';
    assert.throws(() => assertPublishable(d), /personal_note/);
  });

  it('REFUSES when the hero image is missing', () => {
    const d = approvedDraft();
    d.image = '';
    assert.throws(() => assertPublishable(d), /image/);
  });

  it('REFUSES an already-published draft (no double publish)', () => {
    const d = approvedDraft();
    d.live_url = 'https://example.com/blog/x';
    assert.throws(() => assertPublishable(d), /already published/);
  });

  it('REFUSES a draft with no body sections', () => {
    const d = approvedDraft();
    d.body = { sections: [], faqs: [] };
    assert.throws(() => assertPublishable(d), /sections/);
  });
});

describe('P2 — pin scheduler guardrail', () => {
  const publishedDraft = () => ({
    ...approvedDraft(),
    status: 'published',
    live_url: 'https://recipe-seeker-client.vercel.app/blog/iron-rich-lentil-bowls',
  });

  it('allows a published draft with a live URL', () => {
    assert.equal(assertPinCreatable(publishedDraft()), true);
  });

  it('REFUSES an approved-but-not-published draft', () => {
    const d = publishedDraft();
    d.status = 'approved';
    d.live_url = null;
    assert.throws(() => assertPinCreatable(d), GuardrailError);
  });

  it('REFUSES a pending_review draft', () => {
    const d = publishedDraft();
    d.status = 'pending_review';
    assert.throws(() => assertPinCreatable(d), GuardrailError);
  });
});

describe('P3 — draft generator cannot skip the personal note', () => {
  it('flags a draft with an empty personal_note', () => {
    const d = approvedDraft();
    d.personal_note = '';
    const problems = validateNewDraft(d);
    assert.ok(problems.some((p) => p.includes('personal_note')));
  });

  it('accepts a complete draft', () => {
    assert.deepEqual(validateNewDraft(approvedDraft()), []);
  });
});

describe('P4 — daily caps', () => {
  it('allows writing when under the cap and returns remaining slots', () => {
    assert.equal(enforceDailyCap(2, 5, 'miner'), 3);
  });

  it('STOPS when the cap is reached', () => {
    assert.throws(() => enforceDailyCap(5, 5, 'miner'), /daily cap reached/);
  });
});

describe('numeric health-claim flagging', () => {
  it('flags "25g protein" style claims', () => {
    const found = flagNumericHealthClaims('Each bowl packs 25g protein to keep you full.');
    assert.ok(found.length > 0);
    assert.match(found[0].claim, /25g/i);
  });

  it('flags "8mg iron" style claims', () => {
    const found = flagNumericHealthClaims('One serving gives you 8mg iron, a solid share of your day.');
    assert.ok(found.length > 0);
  });

  it('ignores plain numbers with no unit near no health words', () => {
    const found = flagNumericHealthClaims('Bake for 25 minutes at 180 degrees.');
    assert.equal(found.length, 0);
  });
});

describe('keyword scoring', () => {
  const topics = ['salmon kale pesto pasta', 'iron vitamin c food pairings'];

  it('skips keywords the site already covers', () => {
    const { covered } = scoreKeyword('salmon kale pesto pasta', 90, topics);
    assert.equal(covered, true);
  });

  it('catches a keyword fully contained in an existing topic', () => {
    const { covered } = scoreKeyword('kale pesto pasta', 90, ['salmon kale pesto pasta']);
    assert.equal(covered, true);
  });

  it('does NOT nuke keywords that merely share one generic word with a category', () => {
    // old substring logic marked every "* iron *" keyword as covered by the "Iron" category
    assert.equal(isCoveredByTopics('quinoa iron power bowls', ['Iron', 'Breakfast']), false);
    assert.equal(isCoveredByTopics('tahini calcium dressing', ['Calcium', 'Meal Prep']), false);
    assert.equal(isCoveredByTopics('meal prep for night shift', ['Meal Prep']), false);
  });

  it('rewards gap + niche keywords', () => {
    const a = scoreKeyword('zinc rich snacks for kids', 70, topics);
    const b = scoreKeyword('vintage car restoration', 95, topics);
    assert.ok(a.score > b.score, `niche gap (${a.score}) should beat off-topic (${b.score})`);
  });
});

describe('slugify', () => {
  it('matches the site slug style', () => {
    assert.equal(slugify('Iron-Rich Lentil Bowls!'), 'iron-rich-lentil-bowls');
  });
});
