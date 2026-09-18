/**
 * Minimal Supabase REST client for the pipeline scripts.
 * Uses the service_role key (server-side only — NEVER expose in the browser).
 * No dependencies: plain fetch (Node 18+).
 */

export function createDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL / SUPABASE_SERVICE_KEY. Copy pipeline/.env.example to .env and fill them in.'
    );
  }
  const base = url.replace(/\/$/, '') + '/rest/v1';

  async function req(method, path, body) {
    const res = await fetch(base + path, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase ${method} ${path} -> ${res.status}: ${text}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  return {
    /** GET rows: db.select('drafts', 'status=eq.approved&order=created_at.desc&limit=10') */
    select: (table, qs = '') => req('GET', `/${table}${qs ? `?${qs}` : ''}`),
    /** POST rows (array): returns inserted rows */
    insert: (table, rows) => req('POST', `/${table}`, Array.isArray(rows) ? rows : [rows]),
    /** PATCH rows matching qs: returns updated rows */
    update: (table, qs, patch) => req('PATCH', `/${table}?${qs}`, patch),
    /** Count rows created today (UTC) — used for daily caps. */
    countToday: async (table, qs = '') => {
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      const rows = await req(
        'GET',
        `/${table}?select=id${qs ? `&${qs}` : ''}&created_at=gte.${start.toISOString()}`
      );
      return rows.length;
    },
  };
}
