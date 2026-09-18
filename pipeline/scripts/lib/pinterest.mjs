/**
 * Tiny Pinterest API v5 client (no dependencies, plain fetch).
 * Docs: https://developers.pinterest.com/docs/api/v5/
 *
 * Required env: PINTEREST_ACCESS_TOKEN
 * Rate limits (documented, per app): ~1000 read req/min, ~100 write req/min.
 * This client stays far below that: 300ms pause between writes.
 */

const API = (process.env.PINTEREST_API_BASE || 'https://api.pinterest.com/v5').replace(/\/$/, '');

export function createPinterest() {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'Missing PINTEREST_ACCESS_TOKEN. See pipeline/docs/pin-scheduler-guide.md for how to create one.'
    );
  }

  async function req(method, path, body) {
    const res = await fetch(API + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON response */
    }
    if (!res.ok) {
      throw new Error(`Pinterest ${method} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
    }
    return json;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  return {
    /**
     * Trending keywords for a region.
     * GET /trends/keywords/{region}/top/{trend_type}
     * trend_type: 'growing' | 'monthly' | 'yearly' | 'seasonal'
     * Returns the raw JSON — the miner parses it defensively.
     */
    trendingKeywords: ({ region = 'US', trendType = 'growing', limit = 25 } = {}) =>
      req(
        'GET',
        `/trends/keywords/${encodeURIComponent(region)}/top/${encodeURIComponent(trendType)}` +
          `?limit=${limit}&interests=food_and_drink`
      ),

    /** List the user's boards (to find a board_id). */
    boards: () => req('GET', '/boards?page_size=25'),

    /**
     * Create a pin. Scheduling uses `publish_at` (ISO 8601, UTC, future).
     * If Pinterest rejects publish_at, the caller should retry without it.
     */
    createPin: async (payload) => {
      const pin = await req('POST', '/pins', payload);
      await sleep(300); // stay far under the write rate limit
      return pin; // -> { id, ... }
    },
  };
}

/**
 * Extract keyword strings from the trends endpoint response.
 * The documented shape has shifted before, so this accepts several shapes
 * and throws a descriptive error (with raw keys) if none match — run the
 * miner with DRY_RUN=0 once with your token and read the error if needed.
 */
export function extractTrendKeywords(json) {
  if (!json || typeof json !== 'object') {
    throw new Error(`Unexpected trends response (not an object): ${String(json).slice(0, 200)}`);
  }
  const candidates = [];
  const push = (arr) => {
    for (const item of arr || []) {
      if (typeof item === 'string') candidates.push({ keyword: item, trendScore: 50 });
      else if (item && typeof item === 'object') {
        const keyword = item.keyword || item.term || item.text || item.query;
        if (keyword) {
          candidates.push({
            keyword: String(keyword),
            // normalize any 0..1 or 0..100 signal to 0..100
            trendScore: normalizeScore(item.score ?? item.trend_score ?? item.growth ?? item.value ?? 50),
          });
        }
      }
    }
  };
  if (Array.isArray(json)) push(json);
  push(json.trends);
  push(json.keywords);
  push(json.items);
  push(json.data);
  if (candidates.length === 0) {
    throw new Error(
      `Could not find keywords in trends response. Top-level keys: [${Object.keys(json).join(', ')}]. ` +
        `Sample: ${JSON.stringify(json).slice(0, 300)}`
    );
  }
  // de-dupe (case-insensitive), keep first
  const seen = new Set();
  return candidates.filter((c) => {
    const k = c.keyword.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function normalizeScore(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 50;
  if (n >= 0 && n <= 1) return Math.round(n * 100);
  return Math.max(0, Math.min(100, Math.round(n)));
}
