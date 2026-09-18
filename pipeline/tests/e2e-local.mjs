/**
 * END-TO-END pipeline test — runs ENTIRELY on this machine, no real accounts.
 *
 * Spins up two mock HTTP servers:
 *   - mock Supabase (tiny PostgREST subset: GET/POST/PATCH on the pipeline tables)
 *   - mock Pinterest API v5 (/trends/keywords, /boards, POST /pins)
 * Then runs the real scripts in order, simulating the human approval step:
 *
 *   miner -> generator -> (publisher refuses: nothing approved) ->
 *   (scheduler refuses: nothing published) ->
 *   HUMAN approves one draft -> publisher -> scheduler
 *
 * Also asserts the negative cases: the publisher and scheduler must REFUSE
 * unapproved/unpublished drafts (the P1/P2 guardrails across script
 * boundaries), and the miner must respect its daily cap on a second run.
 *
 * recipes.json is backed up before the publisher runs and restored after.
 *
 * Run:  node pipeline/tests/e2e-local.mjs
 * Exit 0 = all green.
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPTS = join(ROOT, 'pipeline', 'scripts');
const DATA_PATH = join(ROOT, 'client', 'src', 'data', 'recipes.json');
const BACKUP_PATH = DATA_PATH + '.e2e-bak';

const failures = [];
function check(name, cond, detail = '') {
  if (cond) console.log(`  ✔ ${name}`);
  else {
    console.log(`  ✘ ${name}${detail ? ` — ${detail}` : ''}`);
    failures.push(name);
  }
}

// ---------------------------------------------------------------------------
// Mock Supabase: minimal PostgREST (in-memory)
// ---------------------------------------------------------------------------
const tables = {
  keyword_candidates: [],
  drafts: [],
  draft_revisions: [],
  pins: [],
  pipeline_runs: [],
  pipeline_events: [],
};
const columnDefaults = {
  keyword_candidates: { status: 'new' },
  drafts: { status: 'pending_review' },
  pipeline_runs: { status: 'running' },
};
let seq = 1;

function applyQuery(rows, params) {
  let out = [...rows];
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
    const dot = raw.indexOf('.');
    if (dot === -1) continue;
    const op = raw.slice(0, dot);
    const val = raw.slice(dot + 1);
    if (op === 'eq') out = out.filter((r) => String(r[key]) === val);
    else if (op === 'gte') out = out.filter((r) => String(r[key]) >= val);
    else if (op === 'lte') out = out.filter((r) => String(r[key]) <= val);
  }
  const order = params.get('order');
  if (order) {
    const [col, dir] = order.split('.');
    out.sort((a, b) =>
      dir === 'desc'
        ? String(b[col]).localeCompare(String(a[col]))
        : String(a[col]).localeCompare(String(b[col]))
    );
  }
  const limit = params.get('limit');
  if (limit) out = out.slice(0, Number(limit));
  return out;
}

function startMockSupabase() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, 'http://x');
      const m = url.pathname.match(/^\/rest\/v1\/(\w+)$/);
      const send = (code, body) => {
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (!m || !tables[m[1]]) return send(404, { error: 'no such table' });
      const table = m[1];
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        try {
          if (req.method === 'GET') {
            return send(200, applyQuery(tables[table], url.searchParams));
          }
          const body = raw ? JSON.parse(raw) : {};
          if (req.method === 'POST') {
            const items = Array.isArray(body) ? body : [body];
            const inserted = items.map((item) => {
              const row = {
                id: `mock-${seq++}`,
                created_at: new Date().toISOString(),
                ...columnDefaults[table],
                ...item,
              };
              tables[table].push(row);
              return row;
            });
            return send(201, inserted);
          }
          if (req.method === 'PATCH') {
            const matched = applyQuery(tables[table], url.searchParams);
            for (const r of matched) Object.assign(r, body);
            return send(200, matched);
          }
          return send(405, { error: 'method not allowed' });
        } catch (e) {
          return send(400, { error: e.message });
        }
      });
    });
    server.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

// ---------------------------------------------------------------------------
// Mock Pinterest API v5
// ---------------------------------------------------------------------------
const pinsPosted = [];
const MOCK_TRENDS = [
  { keyword: 'lentil bolognese meal prep', score: 91 },
  { keyword: 'tahini calcium dressing', score: 86 },
  { keyword: 'chickpea zinc snacks', score: 80 },
  { keyword: 'miso soup breakfast ideas', score: 75 },
  { keyword: 'quinoa iron power bowls', score: 70 },
  { keyword: 'salmon kale pesto pasta', score: 95 }, // already on the site -> dedupe must skip
  { keyword: 'spinach vitamin c salad', score: 66 },
  { keyword: 'overnight oats protein boost', score: 60 },
];

function startMockPinterest() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, 'http://x');
      const send = (code, body) => {
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (req.method === 'GET' && url.pathname.includes('/trends/keywords/')) {
        return send(200, { trends: MOCK_TRENDS });
      }
      if (req.method === 'GET' && url.pathname === '/v5/boards') {
        return send(200, { items: [{ id: 'board_1', name: 'E2E Test Board' }] });
      }
      if (req.method === 'POST' && url.pathname === '/v5/pins') {
        let raw = '';
        req.on('data', (c) => (raw += c));
        req.on('end', () => {
          const body = JSON.parse(raw);
          pinsPosted.push(body);
          send(201, { id: `pin_mock_${pinsPosted.length}` });
        });
        return;
      }
      return send(404, { error: 'not mocked: ' + req.method + ' ' + url.pathname });
    });
    server.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function runScript(file, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(SCRIPTS, file)], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ code, out }));
  });
}

async function sb(method, port, table, qs, body) {
  const res = await fetch(`http://127.0.0.1:${port}/rest/v1/${table}${qs ? `?${qs}` : ''}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${table} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// The full loop
// ---------------------------------------------------------------------------
async function main() {
  const supa = await startMockSupabase();
  const pinapi = await startMockPinterest();
  const env = {
    SUPABASE_URL: `http://127.0.0.1:${supa.port}`,
    SUPABASE_SERVICE_KEY: 'mock-key',
    PINTEREST_ACCESS_TOKEN: 'mock-token',
    PINTEREST_API_BASE: `http://127.0.0.1:${pinapi.port}/v5`,
    PINTEREST_BOARD_ID: 'board_1',
    SITE_URL: 'https://example.com',
    LLM_PROVIDER: 'manual',
    MAX_KEYWORDS_PER_DAY: '5',
    DRAFTS_PER_DAY: '3',
    PIN_SPACING_HOURS: '6',
  };

  const originalJson = readFileSync(DATA_PATH, 'utf8');
  copyFileSync(DATA_PATH, BACKUP_PATH);

  try {
    console.log('\n[1] keyword miner (first run)');
    let r = await runScript('keyword-miner.mjs', env);
    check('miner exits 0', r.code === 0, r.out.slice(-300));
    let cands = await sb('GET', supa.port, 'keyword_candidates', 'select=*');
    check('miner wrote candidates', cands.length > 0 && cands.length <= 5, `got ${cands.length}`);
    check('all candidates are status=new', cands.every((c) => c.status === 'new'));
    check(
      'dedupe skipped the already-covered pasta keyword',
      !cands.some((c) => c.keyword.includes('salmon kale pesto')),
      cands.map((c) => c.keyword).join(' | ')
    );

    console.log('\n[2] keyword miner (second run — daily cap must stop it)');
    r = await runScript('keyword-miner.mjs', env);
    const cands2 = await sb('GET', supa.port, 'keyword_candidates', 'select=*');
    check('cap enforced: no new rows on second run', cands2.length === cands.length, `${cands.length} -> ${cands2.length}`);
    check('miner reports the cap', /daily cap reached/i.test(r.out), r.out.split('\n').slice(-3).join(' '));

    console.log('\n[3] draft generator');
    r = await runScript('draft-generator.mjs', env);
    check('generator exits 0', r.code === 0, r.out.slice(-300));
    const drafts = await sb('GET', supa.port, 'drafts', 'select=*');
    check('drafts created as pending_review', drafts.length > 0 && drafts.every((d) => d.status === 'pending_review'), `got ${drafts.length}`);
    const updated = await sb('GET', supa.port, 'keyword_candidates', 'status=eq.drafted&select=id');
    check('used candidates marked drafted', updated.length === drafts.length, `${updated.length} vs ${drafts.length}`);

    console.log('\n[4] NEGATIVE: publisher with nothing approved must do nothing');
    r = await runScript('publisher.mjs', env);
    check('publisher exits 0', r.code === 0, r.out.slice(-300));
    check('publisher published nothing', /no approved drafts/i.test(r.out));
    check('recipes.json untouched', readFileSync(DATA_PATH, 'utf8') === originalJson);

    console.log('\n[5] NEGATIVE: pin scheduler with nothing published must do nothing');
    r = await runScript('pin-scheduler.mjs', env);
    check('scheduler exits 0', r.code === 0, r.out.slice(-300));
    check('scheduler created no pins', pinsPosted.length === 0);

    console.log('\n[6] HUMAN: approve one draft (simulating the Review Console)');
    const draft = drafts[0];
    // the human fills the personal note + hero image, then approves
    await sb('PATCH', supa.port, 'drafts', `id=eq.${draft.id}`, {
      personal_note: 'E2E test: I made this with red lentils; they hold shape better.',
      image: '/images/e2e-test.webp',
    });
    await sb('PATCH', supa.port, 'drafts', `id=eq.${draft.id}`, {
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    });
    const afterReview = await sb('GET', supa.port, 'drafts', `id=eq.${draft.id}&select=status`);
    check('draft is now approved', afterReview[0].status === 'approved');

    console.log('\n[7] publisher (after approval)');
    r = await runScript('publisher.mjs', env);
    check('publisher exits 0', r.code === 0, r.out.slice(-300));
    const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
    const before = JSON.parse(originalJson).posts.length;
    check('one post appended to recipes.json', data.posts.length === before + 1, `${before} -> ${data.posts.length}`);
    const newPost = data.posts[data.posts.length - 1];
    check('post has a slug + sections', !!newPost.slug && newPost.sections.length > 0, newPost.slug);
    const pubDraft = await sb('GET', supa.port, 'drafts', `id=eq.${draft.id}&select=status,live_url`);
    check('draft marked published with live_url', pubDraft[0].status === 'published' && pubDraft[0].live_url === `https://example.com/blog/${newPost.slug}`, JSON.stringify(pubDraft[0]));

    console.log('\n[8] pin scheduler (after publish)');
    r = await runScript('pin-scheduler.mjs', env);
    check('scheduler exits 0', r.code === 0, r.out.slice(-300));
    check('exactly one pin sent to Pinterest', pinsPosted.length === 1, `got ${pinsPosted.length}`);
    const payload = pinsPosted[0];
    check('pin links to the live post', payload.link === pubDraft[0].live_url, payload.link);
    check('pin is scheduled (publish_at set)', !!payload.publish_at, payload.publish_at || 'missing');
    check('pin image is the absolute hero URL', payload.media_source?.url === 'https://example.com/images/e2e-test.webp', payload.media_source?.url);
    const pinRows = await sb('GET', supa.port, 'pins', 'select=*');
    check('pin recorded in DB', pinRows.length === 1 && pinRows[0].draft_id === draft.id);

    console.log('\n[9] NEGATIVE: scheduler must not re-pin the same draft');
    r = await runScript('pin-scheduler.mjs', env);
    check('no duplicate pin on rerun', pinsPosted.length === 1, `got ${pinsPosted.length}`);

    console.log('\n[10] run log: every script reported what it did');
    const runs = await sb('GET', supa.port, 'pipeline_runs', 'select=script,status');
    const byScript = {};
    for (const run of runs) byScript[run.script] = (byScript[run.script] || 0) + 1;
    check('miner logged 2 runs', byScript.miner === 2, JSON.stringify(byScript));
    check('generator logged a run', byScript.generator >= 1, JSON.stringify(byScript));
    check('publisher logged 2 runs', byScript.publisher === 2, JSON.stringify(byScript));
    check('scheduler logged 3 runs', byScript.scheduler === 3, JSON.stringify(byScript));
    check('all runs closed ok', runs.every((x) => x.status === 'ok'), JSON.stringify(runs.map((x) => x.status)));
    const events = await sb('GET', supa.port, 'pipeline_events', 'select=script,message,level');
    check('activity events were recorded', events.length >= 10, `got ${events.length}`);
    check(
      'miner logged its skips',
      events.some((e) => e.script === 'miner' && /skipped/i.test(e.message)),
      events.filter((e) => e.script === 'miner').map((e) => e.message).join(' | ').slice(0, 120)
    );
    check(
      'scheduler logged the pin creation',
      events.some((e) => e.script === 'scheduler' && /pin created/i.test(e.message))
    );
  } finally {
    copyFileSync(BACKUP_PATH, DATA_PATH);
    supa.server.close();
    pinapi.server.close();
  }

  const restored = readFileSync(DATA_PATH, 'utf8') === originalJson;
  check('recipes.json restored after test', restored);

  console.log(failures.length === 0 ? '\n✅ E2E: ALL GREEN' : `\n❌ E2E: ${failures.length} FAILURE(S): ${failures.join('; ')}`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('E2E crashed:', e);
  try {
    copyFileSync(BACKUP_PATH, DATA_PATH);
  } catch {}
  process.exit(1);
});
