/**
 * image-gen.mjs — free AI hero-image generation with provider fallback.
 *
 * Chain (each provider runs only when its key is configured):
 *   1. Pollinations.ai — needs POLLINATIONS_API_KEY (free signup at
 *      https://enter.pollinations.ai — free pollen tier, no card).
 *      NOTE (verified 2026-09-20): the anonymous tier is discontinued —
 *      keyless requests fail with 402 INSUFFICIENT_BALANCE, and the only
 *      listed model is `sana` (override via POLLINATIONS_MODEL).
 *   2. Hugging Face FLUX.1-schnell — needs HF_TOKEN (free account, no card).
 *
 * Design rules:
 *   - 3 retries with exponential backoff PER provider before falling through.
 *   - Pollinations asks ~1 req/15s — calls are spaced accordingly.
 *   - generateHeroImage() NEVER throws: on total failure (or no keys) it logs
 *     and returns null so the draft still saves without an image (the human
 *     gate in the Review Console requires a hero image before approval anyway).
 *   - uploadHeroImage() is also non-fatal (returns null on failure).
 *
 * Prompt style follows the style DNA (§4.1 + §4.4):
 *   appetizing food photo, brand palette, and NO text in the image
 *   (typography is added later in Remotion/pin templates).
 *
 * Usage:
 *   import { buildHeroPrompt, generateHeroImage, uploadHeroImage } from './lib/image-gen.mjs';
 *   const img = await generateHeroImage(buildHeroPrompt(title, category), { log: console.log });
 *   if (img) {
 *     const url = await uploadHeroImage(img.buffer, slugify(title), img.contentType, console.log);
 *   }
 *
 * Env (all optional — missing keys just skip that provider):
 *   POLLINATIONS_API_KEY, POLLINATIONS_MODEL (default: sana), HF_TOKEN
 */

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';
const HF_MODEL_URL =
  'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell';

// Style suffix from the style DNA (§4.4) — appended to every prompt.
const STYLE_SUFFIX =
  'warm cream and deep forest green palette, tomato-orange accents, ' +
  'soft natural lighting, editorial food-magazine aesthetic, ' +
  'high detail, appetizing, no text';

/**
 * Build the hero-image prompt from the draft (style DNA §4.1).
 * Landscape 1200x630 — the blog hero / OG ratio.
 */
export function buildHeroPrompt(title, category = '') {
  const dish = String(title || 'healthy dinner')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  const cat = String(category || '').trim();
  return (
    `Overhead shot of ${dish}, rustic ceramic bowl on warm cream linen, ` +
    `soft natural window light, gentle steam, appetizing food photography, ` +
    `shallow depth of field, editorial style` +
    (cat ? `, ${cat} recipe` : '') +
    `, ${STYLE_SUFFIX}`
  );
}

// --- rate limiting (Pollinations: ~1 req / 15s anonymous) --------------------
let lastPollinationsAt = 0;
/** Test hook: reset the rate-limit clock. */
export function _resetImageGenState() {
  lastPollinationsAt = 0;
}

async function respectRateLimit() {
  const wait = 15_000 - (Date.now() - lastPollinationsAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

// --- retry helper ------------------------------------------------------------
async function withRetries(fn, label, { tries = 3, baseDelayMs = 2000, log = () => {} } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      lastErr = e;
      log(
        `[image] ${label} attempt ${attempt}/${tries} failed: ` +
          String(e && e.message ? e.message : e).split('\n')[0].slice(0, 140)
      );
      if (attempt < tries) await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** (attempt - 1)));
    }
  }
  throw lastErr;
}

function shortErr(e) {
  return String(e && e.message ? e.message : e).split('\n')[0].slice(0, 160);
}

async function readImage(res, who) {
  if (!res.ok) {
    let body = '';
    try {
      body = (await res.text()).slice(0, 200);
    } catch {
      /* ignore */
    }
    throw new Error(`${who} -> HTTP ${res.status}: ${body}`);
  }
  const ct = (res.headers.get('content-type') || '').split(';')[0].trim();
  if (!ct.startsWith('image/')) throw new Error(`${who} -> unexpected content-type "${ct}"`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 10_000) throw new Error(`${who} -> suspiciously small image (${buffer.length} bytes)`);
  return { buffer, contentType: ct };
}

// --- providers ----------------------------------------------------------------
async function viaPollinations(prompt, opts = {}) {
  const { fetchFn = fetch, log = () => {}, baseDelayMs = 2000 } = opts;
  const key = process.env.POLLINATIONS_API_KEY;
  if (!key) {
    log('[image] POLLINATIONS_API_KEY not set — skipping Pollinations (anonymous tier discontinued)');
    return null;
  }
  const model = process.env.POLLINATIONS_MODEL || 'sana'; // only listed model, verified 2026-09-20
  return withRetries(
    async () => {
      if (!opts.skipRateLimit) await respectRateLimit();
      const seed = Math.floor(Math.random() * 1_000_000_000);
      const url =
        `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}` +
        `?model=${encodeURIComponent(model)}&width=1200&height=630&nologo=true&private=true&seed=${seed}`;
      const res = await fetchFn(url, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(120_000),
      });
      lastPollinationsAt = Date.now();
      const img = await readImage(res, 'Pollinations');
      return { ...img, provider: 'pollinations' };
    },
    'pollinations',
    { log, baseDelayMs }
  );
}

async function viaHuggingFace(prompt, opts = {}) {
  const { fetchFn = fetch, log = () => {}, baseDelayMs = 2000 } = opts;
  const token = process.env.HF_TOKEN;
  if (!token) {
    log('[image] HF_TOKEN not set — skipping Hugging Face fallback');
    return null;
  }
  const img = await withRetries(
    async () => {
      const res = await fetchFn(HF_MODEL_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: prompt }),
        signal: AbortSignal.timeout(120_000),
      });
      return await readImage(res, 'HuggingFace');
    },
    'huggingface',
    { log, baseDelayMs }
  );
  return { ...img, provider: 'huggingface' };
}

/**
 * Generate a hero image through the fallback chain.
 * Each provider is skipped when its key is unset; exhausted providers fall
 * through to the next. Returns { buffer, contentType, provider } or null.
 * NEVER throws.
 */
export async function generateHeroImage(prompt, opts = {}) {
  const log = opts.log || (() => {});
  const chain = [
    ['pollinations', viaPollinations],
    ['huggingface', viaHuggingFace],
  ];
  for (const [name, fn] of chain) {
    try {
      const img = await fn(prompt, opts);
      if (img) {
        log(`[image] generated via ${img.provider} (${(img.buffer.length / 1024).toFixed(0)} KB)`);
        return img;
      }
      // null = provider not configured — try the next one silently.
    } catch (e) {
      log(`[image] ${name} exhausted: ${shortErr(e)}`);
    }
  }
  log('[image] all providers failed or unconfigured — draft will save without a hero image');
  return null;
}

// --- Supabase Storage upload ---------------------------------------------------
function storageCreds() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('missing SUPABASE_URL / SUPABASE_SERVICE_KEY');
  return { url, key };
}

async function ensureBucket(log) {
  const { url, key } = storageCreds();
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const get = await fetch(`${url}/storage/v1/bucket/ai-images`, { headers });
  if (get.ok) return;
  log('[image] creating public storage bucket "ai-images"');
  const create = await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ id: 'ai-images', name: 'ai-images', public: true }),
  });
  if (!create.ok && create.status !== 409) {
    throw new Error(`bucket create -> HTTP ${create.status}: ${(await create.text()).slice(0, 200)}`);
  }
}

/**
 * Upload a hero image to the public `ai-images` bucket.
 * Returns the public URL, or null on any failure (never throws).
 */
export async function uploadHeroImage(buffer, slug, contentType = 'image/jpeg', log = () => {}) {
  try {
    const { url, key } = storageCreds();
    await ensureBucket(log);
    const safeSlug = String(slug || 'draft').replace(/[^a-z0-9-]+/g, '-').slice(0, 60) || 'draft';
    const ext = String(contentType).includes('png') ? 'png' : 'jpg';
    const path = `drafts/${safeSlug}-${Date.now()}.${ext}`;
    const up = await fetch(`${url}/storage/v1/object/ai-images/${path}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': contentType },
      body: buffer,
    });
    if (!up.ok) throw new Error(`upload -> HTTP ${up.status}: ${(await up.text()).slice(0, 200)}`);
    const publicUrl = `${url}/storage/v1/object/public/ai-images/${path}`;
    log(`[image] uploaded -> ${publicUrl}`);
    return publicUrl;
  } catch (e) {
    log(`[image] upload failed (non-fatal): ${shortErr(e)}`);
    return null;
  }
}
