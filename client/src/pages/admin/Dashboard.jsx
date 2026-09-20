import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'
import Seo from '../../components/Seo'
import ReviewConsole from './ReviewConsole'

/**
 * Growth Pipeline Dashboard — the control center. Route: /admin/dashboard.
 *
 * Tabs:
 *   Overview — funnel, stats, pipeline health, what needs you, quick actions
 *   Review   — THE human gate (redesigned ReviewConsole: preview + edit)
 *   Content  — every draft ever, filterable by status
 *   Pins     — pin queue: scheduled vs live, per post
 *   Keywords — what the miner found, scores, statuses
 *   AI       — which provider/model wrote what (observability)
 *   Activity — full event log, filterable by script + level
 *   Settings — table health, caps, secrets note
 *
 * Only emails in `pipeline_admins` may enter.
 */

// ---------- brand ----------
const GREEN = '#1e4633'
const CREAM = '#fffdf8'
const TOMATO = '#E4572E'
const BORDER = '#e3d9c8'
const MUTED = '#6b5f4d'
const SERIF = 'Georgia, "Times New Roman", serif'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'review', label: 'Review' },
  { id: 'content', label: 'Content' },
  { id: 'pins', label: 'Pins' },
  { id: 'keywords', label: 'Keywords' },
  { id: 'ai', label: 'AI' },
  { id: 'activity', label: 'Activity' },
  { id: 'settings', label: 'Settings' },
]

const SCRIPTS = ['miner', 'generator', 'publisher', 'scheduler']
const SCRIPT_LABEL = { miner: 'Miner', generator: 'Generator', publisher: 'Publisher', scheduler: 'Scheduler' }
const SCRIPT_DESC = {
  miner: 'Finds trending keywords on Pinterest',
  generator: 'AI writes drafts from keywords',
  publisher: 'Publishes drafts you approved',
  scheduler: 'Schedules pins for published posts',
}
const CHIP = {
  miner: { bg: '#e3efe7', fg: GREEN },
  generator: { bg: '#e7e4f7', fg: '#3e3670' },
  publisher: { bg: '#fbe9e1', fg: '#c24a24' },
  scheduler: { bg: '#e8f0fa', fg: '#2456a6' },
  you: { bg: '#fff3d6', fg: '#8a6d1b' },
}
const STATUS_STYLE = {
  new: ['#e8f0fa', '#2456a6'],
  drafted: ['#fff3d6', '#8a6d1b'],
  pending_review: ['#fbe9e1', '#c24a24'],
  approved: ['#e7e4f7', '#3e3670'],
  rejected: ['#f1ece1', '#6b5f4d'],
  published: ['#e3efe7', GREEN],
}

// ---------- helpers ----------
function ago(iso) {
  if (!iso) return '—'
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 0) return 'just now'
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}
/** Safe query: returns { data } or { error }. Never throws. */
async function safe(promise) {
  try {
    const { data, error } = await promise
    if (error) return { error: error.message }
    return { data: data || [] }
  } catch (e) {
    return { error: e.message }
  }
}
/** "Draft X saved as pending_review via openrouter/model:free" -> {title, provider, model} */
export function parseAiEvent(message) {
  const m = /Draft "(.+?)" saved as pending_review via ([^/]+)\/(.+)$/.exec(message || '')
  if (!m) return null
  return { title: m[1], provider: m[2], model: m[3] }
}

// ---------- tiny components ----------
const card = { border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, background: CREAM }
const num = { fontFamily: SERIF, fontSize: 30, fontWeight: 700, color: GREEN }
const lbl = { fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 1.4 }
const h2 = { fontFamily: SERIF, fontSize: 18, margin: '26px 0 10px', color: GREEN }
const pill = (bg, fg) => ({
  display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 10px',
  borderRadius: 12, background: bg, color: fg, whiteSpace: 'nowrap',
})
const btn = (bg) => ({
  padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: bg, color: '#fff', fontWeight: 700, fontSize: 14, marginRight: 8, marginBottom: 8,
  minHeight: 44,
})
const ghostBtn = {
  padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
  background: CREAM, color: GREEN, border: `1px solid #d8cfc2`, marginRight: 8, marginBottom: 8,
  minHeight: 44,
}

export function Empty({ text }) {
  return <p style={{ color: MUTED, fontSize: 14 }}>{text}</p>
}
export function Chip({ script }) {
  const c = CHIP[script] || CHIP.you
  return (
    <span style={{ ...pill(c.bg, c.fg), textTransform: 'uppercase', fontSize: 10, letterSpacing: '.05em' }}>
      {SCRIPT_LABEL[script] || script}
    </span>
  )
}
export function StatusPill({ status }) {
  const [bg, fg] = STATUS_STYLE[status] || ['#efe7d6', MUTED]
  return <span style={pill(bg, fg)}>{(status || '').replace(/_/g, ' ')}</span>
}
export function SectionTitle({ children }) {
  return <h2 style={h2}>{children}</h2>
}
function StatCard({ value, label, accent }) {
  return (
    <div style={card}>
      <div style={{ ...num, ...(accent ? { color: accent } : {}) }}>{value}</div>
      <div style={lbl}>{label}</div>
    </div>
  )
}

/* ============================== OVERVIEW ============================== */

export function OverviewView({ data, onCopy, copied, goTab }) {
  const { funnel, health, events, attention } = data
  return (
    <div>
      {attention.length > 0 && (
        <div style={{ ...card, marginTop: 16, borderColor: TOMATO, background: '#fff7f3' }}>
          <div style={{ fontWeight: 800, marginBottom: 8, color: TOMATO }}>Needs your attention</div>
          {attention.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, fontSize: 14 }}>
              <span style={{ flex: 1 }}>{a.text}</span>
              <button style={{ ...ghostBtn, margin: 0, minHeight: 36, padding: '6px 12px' }} onClick={() => goTab(a.tab)}>
                {a.cta}
              </button>
            </div>
          ))}
        </div>
      )}

      <SectionTitle>Pipeline funnel</SectionTitle>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {funnel.map((f, i) => (
          <React.Fragment key={f.label}>
            <div style={{ ...card, flex: 1, minWidth: 110, textAlign: 'center', padding: '12px 8px' }}>
              <div style={{ ...num, fontSize: 26 }}>{f.value}</div>
              <div style={lbl}>{f.label}</div>
              {f.sub && <div style={{ fontSize: 10, color: MUTED }}>{f.sub}</div>}
            </div>
            {i < funnel.length - 1 && (
              <div style={{ alignSelf: 'center', color: '#b9ac97', fontSize: 18, flex: 'none' }}>→</div>
            )}
          </React.Fragment>
        ))}
      </div>

      <SectionTitle>Pipeline health</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {SCRIPTS.map((s) => {
          const h = health[s] || {}
          const st = h.status
          const dot = st === 'ok' ? '#1a7a3c' : st === 'failed' ? '#b03a2e' : '#b9ac97'
          const word = st === 'ok' ? 'healthy' : st === 'failed' ? 'failed' : 'not run yet'
          return (
            <div key={s} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: dot, flex: 'none' }} />
                <b style={{ fontSize: 14 }}>{SCRIPT_LABEL[s]}</b>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: MUTED }}>{word}</span>
              </div>
              <div style={{ fontSize: 12, color: MUTED, margin: '6px 0' }}>{SCRIPT_DESC[s]}</div>
              <div style={{ fontSize: 12 }}>
                {h.started_at ? (
                  <>Last run <b>{ago(h.started_at)}</b>{h.summaryText ? <><br /><span style={{ color: MUTED }}>{h.summaryText}</span></> : null}</>
                ) : (
                  <span style={{ color: MUTED }}>No runs recorded yet</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <SectionTitle>Latest activity</SectionTitle>
      {events.length === 0 && <Empty text="No pipeline activity yet — run the miner to start the loop." />}
      {events.map((e, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, padding: '9px 0', borderBottom: '1px solid #efe7d6' }}>
          <Chip script={e.script} />
          <span style={{ flex: 1, color: e.level === 'error' ? '#b03a2e' : e.level === 'warn' ? '#8a6d1b' : 'inherit' }}>{e.message}</span>
          <span style={{ fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>{ago(e.created_at)}</span>
        </div>
      ))}
      {events.length > 0 && (
        <button style={ghostBtn} onClick={() => goTab('activity')}>Full activity log →</button>
      )}

      <SectionTitle>Quick actions</SectionTitle>
      <p style={{ fontSize: 13, color: MUTED, marginTop: 0 }}>
        Scripts run in your terminal from the repo root — tap a button to copy the exact command.
      </p>
      <div>
        {[
          ['miner', '⛏ Run keyword miner', 'node pipeline/scripts/keyword-miner.mjs'],
          ['generator', '✍ Generate drafts (AI)', 'node pipeline/scripts/draft-generator.mjs'],
          ['generator-dry', '🧪 Test generator (no save)', 'DRY_RUN=1 node pipeline/scripts/draft-generator.mjs'],
          ['publisher', '🚀 Publish approved', 'node pipeline/scripts/publisher.mjs'],
          ['scheduler', '📌 Schedule pins', 'node pipeline/scripts/pin-scheduler.mjs'],
          ['boards', '📌 List Pinterest boards', 'node pipeline/scripts/pin-scheduler.mjs --boards'],
          ['llm', '🤖 Test AI chain', 'node pipeline/scripts/test-llm.mjs'],
        ].map(([key, label, cmd]) => (
          <button key={key} style={ghostBtn} onClick={() => onCopy(cmd, label)}>
            {copied === label ? '✓ Copied!' : label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ============================== CONTENT ============================== */

const CONTENT_FILTERS = ['all', 'pending_review', 'approved', 'rejected', 'published']

export function ContentView({ drafts }) {
  const [filter, setFilter] = useState('all')
  const list = (drafts || []).filter((d) => filter === 'all' || d.status === filter)
  const counts = {}
  for (const d of drafts || []) counts[d.status] = (counts[d.status] || 0) + 1
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 0 }}>
        {CONTENT_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...ghostBtn,
              ...(filter === f ? { background: GREEN, color: '#fff', borderColor: GREEN } : {}),
            }}
          >
            {f === 'all' ? `All (${(drafts || []).length})` : `${f.replace(/_/g, ' ')} (${counts[f] || 0})`}
          </button>
        ))}
      </div>
      {list.length === 0 && <Empty text={filter === 'all' ? 'No drafts yet — run the generator.' : `No drafts with status "${filter}".`} />}
      {list.map((d) => (
        <div key={d.id} style={{ ...card, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{d.title || '(untitled)'}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
                {d.category} · {(d.flagged_claims || []).length} flagged · {(d.pin_variants || []).length} pin variants · {ago(d.created_at)}
              </div>
              {d.status === 'published' && d.live_url && (
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  <a href={d.live_url} target="_blank" rel="noreferrer" style={{ color: '#2456a6' }}>{d.live_url}</a>
                </div>
              )}
            </div>
            <StatusPill status={d.status} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ============================== PINS ============================== */

export function PinsView({ pins }) {
  const scheduled = (pins || []).filter((p) => p.publish_at && !p.published_at)
  const live = (pins || []).filter((p) => p.published_at)
  const immediate = (pins || []).filter((p) => !p.publish_at && !p.published_at)
  const PinCard = ({ p }) => (
    <div key={p.id} style={{ ...card, marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={{
        width: 48, height: 48, borderRadius: 8, background: GREEN, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: SERIF, fontWeight: 700, fontSize: 20, flex: 'none',
      }}>
        {(p.draftTitle || p.title || 'P')[0].toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{p.draftTitle || p.title}</div>
        <div style={{ fontSize: 11, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Board: {p.board_id}
        </div>
        <div style={{ fontSize: 11, color: MUTED }}>
          {p.published_at ? `went live ${ago(p.published_at)}` : p.publish_at ? `scheduled for ${fmt(p.publish_at)}` : 'publish time not set'}
        </div>
      </div>
      {p.published_at
        ? <span style={pill('#e3efe7', GREEN)}>live</span>
        : p.publish_at
          ? <span style={pill('#fff3d6', '#8a6d1b')}>scheduled</span>
          : <span style={pill('#e8f0fa', '#2456a6')}>queued</span>}
    </div>
  )
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 8 }}>
        <StatCard value={scheduled.length} label="Scheduled" accent="#8a6d1b" />
        <StatCard value={live.length} label="Live on Pinterest" />
        <StatCard value={immediate.length} label="Queued (no time set)" accent="#2456a6" />
      </div>
      {(pins || []).length === 0 && <Empty text="No pins yet — the scheduler creates them from published posts." />}
      {scheduled.length > 0 && <><SectionTitle>Scheduled</SectionTitle>{scheduled.map((p) => <PinCard key={p.id} p={p} />)}</>}
      {live.length > 0 && <><SectionTitle>Live</SectionTitle>{live.map((p) => <PinCard key={p.id} p={p} />)}</>}
      {immediate.length > 0 && <><SectionTitle>Queued</SectionTitle>{immediate.map((p) => <PinCard key={p.id} p={p} />)}</>}
    </div>
  )
}

/* ============================== KEYWORDS ============================== */

export function KeywordsView({ keywords }) {
  return (
    <div style={{ marginTop: 16 }}>
      {(keywords || []).length === 0 && <Empty text="No keywords yet — run the miner (⛏ button on the Overview tab)." />}
      {(keywords || []).map((k, i) => (
        <div key={k.id || i} style={{ ...card, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{k.keyword}</div>
              <div style={{ fontSize: 11, color: MUTED }}>
                mined {ago(k.created_at)}
                {k.trend_score != null && <> · trend {Math.round(k.trend_score)}</>}
              </div>
            </div>
            <div style={{ width: 90, height: 6, borderRadius: 3, background: '#efe7d6', overflow: 'hidden', flex: 'none' }}>
              <div style={{ width: `${Math.min(100, k.score || 0)}%`, height: '100%', background: TOMATO }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, width: 34, textAlign: 'right', flex: 'none' }}>{k.score ?? '—'}</div>
            <StatusPill status={k.status} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ============================== AI ============================== */

const CHAIN = [
  { id: 'xai', name: 'xAI · Grok', note: 'Skipped unless XAI_API_KEY is set (console asks for top-up).' },
  { id: 'openrouter', name: 'OpenRouter · :free models', note: 'No card needed. Model IDs rotate — the pipeline tries several in order.' },
  { id: 'nvidia', name: 'NVIDIA NIM', note: 'Free credits, no card. Direct fallback if OpenRouter is down.' },
  { id: 'gemini', name: 'Gemini', note: 'Last resort by your choice.' },
]

export function AiView({ generations }) {
  const gens = (generations || []).map((e) => ({ ...e, parsed: parseAiEvent(e.message) })).filter((e) => e.parsed)
  const byModel = {}
  for (const g of gens) {
    const key = `${g.parsed.provider}/${g.parsed.model}`
    byModel[key] = (byModel[key] || 0) + 1
  }
  return (
    <div style={{ marginTop: 16 }}>
      <SectionTitle style={{ marginTop: 0 }}>Provider chain</SectionTitle>
      <p style={{ fontSize: 13, color: MUTED, marginTop: 0 }}>
        The writer tries providers top-down and uses the first one that answers. Any provider without a key is skipped silently.
      </p>
      {CHAIN.map((c, i) => (
        <div key={c.id} style={{ ...card, marginBottom: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: i === 0 ? '#efe7d6' : GREEN,
            color: i === 0 ? MUTED : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 13, flex: 'none',
          }}>{i + 1}</div>
          <div>
            <div style={{ fontWeight: 700 }}>{c.name}</div>
            <div style={{ fontSize: 12, color: MUTED }}>{c.note}</div>
          </div>
        </div>
      ))}

      <SectionTitle>What the AI wrote recently</SectionTitle>
      {gens.length === 0 && <Empty text="No AI generations logged yet — run the generator." />}
      {gens.map((g, i) => (
        <div key={i} style={{ ...card, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{g.parsed.title}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
            <span style={pill('#e7e4f7', '#3e3670')}>{g.parsed.provider}</span>
            <code style={{ fontSize: 11, color: MUTED }}>{g.parsed.model}</code>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: MUTED }}>{ago(g.created_at)}</span>
          </div>
        </div>
      ))}

      {Object.keys(byModel).length > 0 && (
        <>
          <SectionTitle>Model usage</SectionTitle>
          {Object.entries(byModel).sort((a, b) => b[1] - a[1]).map(([m, n]) => (
            <div key={m} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid #efe7d6', fontSize: 13 }}>
              <code style={{ flex: 1, fontSize: 12 }}>{m}</code>
              <b>{n} draft{n === 1 ? '' : 's'}</b>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

/* ============================== ACTIVITY ============================== */

export function ActivityView({ events }) {
  const [script, setScript] = useState('all')
  const [level, setLevel] = useState('all')
  const list = (events || []).filter(
    (e) => (script === 'all' || e.script === script) && (level === 'all' || (e.level || 'info') === level)
  )
  const levelPill = (lv) => {
    const l = lv || 'info'
    const map = { info: ['#e8f0fa', '#2456a6'], warn: ['#fff3d6', '#8a6d1b'], error: ['#fdecea', '#b03a2e'] }
    const [bg, fg] = map[l] || map.info
    return <span style={pill(bg, fg)}>{l}</span>
  }
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ marginBottom: 12 }}>
        {['all', ...SCRIPTS].map((s) => (
          <button key={s} onClick={() => setScript(s)}
            style={{ ...ghostBtn, ...(script === s ? { background: GREEN, color: '#fff', borderColor: GREEN } : {}) }}>
            {s === 'all' ? 'All scripts' : SCRIPT_LABEL[s]}
          </button>
        ))}
      </div>
      <div style={{ marginBottom: 12 }}>
        {['all', 'info', 'warn', 'error'].map((l) => (
          <button key={l} onClick={() => setLevel(l)}
            style={{ ...ghostBtn, ...(level === l ? { background: GREEN, color: '#fff', borderColor: GREEN } : {}) }}>
            {l === 'all' ? 'All levels' : l}
          </button>
        ))}
      </div>
      {list.length === 0 && <Empty text="No events match these filters." />}
      {list.map((e, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, padding: '9px 0', borderBottom: '1px solid #efe7d6' }}>
          <Chip script={e.script} />
          <span style={{ flex: 1 }}>{e.message}</span>
          {levelPill(e.level)}
          <span style={{ fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>{ago(e.created_at)}</span>
        </div>
      ))}
    </div>
  )
}

/* ============================== SETTINGS ============================== */

export function SettingsView({ health }) {
  return (
    <div style={{ marginTop: 16 }}>
      <h2 style={{ ...h2, marginTop: 0 }}>Pipeline tables</h2>
      {(health || []).map((h) => (
        <div key={h.table} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid #efe7d6', fontSize: 14 }}>
          <code style={{ flex: 1 }}>{h.table}</code>
          {h.ok
            ? <span style={pill('#e3efe7', GREEN)}>✓ exists</span>
            : <span style={pill('#fdecea', '#b03a2e')}>✗ {h.error || 'missing'}</span>}
        </div>
      ))}
      {(health || []).some((h) => !h.ok) && (
        <p style={{ fontSize: 13, color: MUTED }}>
          Some tables are missing — apply <code>pipeline/supabase/schema-pipeline.sql</code> in the Supabase SQL Editor, then reload.
        </p>
      )}
      <SectionTitle>Daily caps</SectionTitle>
      <div style={{ fontSize: 14, lineHeight: 2.1 }}>
        <div>Keywords mined per day: <b>5</b></div>
        <div>Drafts generated per day: <b>3</b></div>
        <div>Hours between pins: <b>6</b></div>
      </div>
      <p style={{ fontSize: 12, color: MUTED }}>Caps are set in the pipeline scripts' env vars — ask Neo to change them.</p>
      <SectionTitle>Secrets</SectionTitle>
      <p style={{ fontSize: 13, color: MUTED }}>
        API tokens live in the gitignored <code>.env</code> on the machine that runs the scripts — never in this dashboard, never in the browser.
        The AI chain needs <code>OPENROUTER_API_KEY</code> and/or <code>NVIDIA_API_KEY</code>; the pipeline needs{' '}
        <code>SUPABASE_URL</code> + <code>SUPABASE_SERVICE_KEY</code>; the scheduler needs <code>PINTEREST_ACCESS_TOKEN</code>.
      </p>
    </div>
  )
}

/* ============================== CONTAINER ============================== */

export default function Dashboard() {
  const { user, loading: authLoading, configured, signInWithGoogle, signOut } = useAuth()
  const [admin, setAdmin] = useState(null)
  const [tab, setTab] = useState('overview')
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState('')
  const [tabLoading, setTabLoading] = useState(false)

  const [overview, setOverview] = useState(null)
  const [drafts, setDrafts] = useState(null)
  const [pins, setPins] = useState(null)
  const [keywords, setKeywords] = useState(null)
  const [generations, setGenerations] = useState(null)
  const [activity, setActivity] = useState(null)
  const [health, setHealth] = useState(null)

  // ---- admin gate ----
  useEffect(() => {
    if (authLoading) return
    if (!configured || !user?.email) {
      setAdmin(false)
      return
    }
    getSupabase().then(async (sb) => {
      if (!sb) return setAdmin(false)
      const { data, error } = await sb
        .from('pipeline_admins')
        .select('email')
        .eq('email', user.email)
        .maybeSingle()
      if (error) setMsg(`Admin check failed: ${error.message}`)
      setAdmin(error ? false : !!data)
    })
  }, [authLoading, configured, user])

  const countWhere = useCallback(async (sb, table, filter) => {
    let q = sb.from(table).select('id', { count: 'exact', head: true })
    if (filter) q = q.match(filter)
    const { count, error } = await q
    return error ? 0 : (count ?? 0)
  }, [])

  const loadOverview = useCallback(async (sb) => {
    const [kwNew, pend, appr, pub, pinCount, runs, ev] = await Promise.all([
      countWhere(sb, 'keyword_candidates', { status: 'new' }),
      countWhere(sb, 'drafts', { status: 'pending_review' }),
      countWhere(sb, 'drafts', { status: 'approved' }),
      countWhere(sb, 'drafts', { status: 'published' }),
      countWhere(sb, 'pins', null),
      safe(sb.from('pipeline_runs').select('script,status,started_at,summary').order('started_at', { ascending: false }).limit(40)),
      safe(sb.from('pipeline_events').select('script,message,level,created_at').order('created_at', { ascending: false }).limit(8)),
    ])
    const latest = {}
    for (const r of runs.data || []) {
      if (!latest[r.script]) {
        let summaryText = ''
        try {
          const s = r.summary || {}
          const bits = []
          if (s.drafts != null) bits.push(`${s.drafts} drafts`)
          if (s.keywords != null) bits.push(`${s.keywords} keywords`)
          if (s.published != null) bits.push(`${s.published} published`)
          if (s.reason) bits.push(s.reason)
          summaryText = bits.join(' · ')
        } catch { /* ignore */ }
        latest[r.script] = { ...r, summaryText }
      }
    }
    const attention = []
    if (pend > 0) attention.push({ text: `${pend} draft${pend === 1 ? '' : 's'} waiting for your review — nothing publishes until you approve.`, tab: 'review', cta: 'Review now' })
    const dayAgo = Date.now() - 864e5
    for (const s of SCRIPTS) {
      const r = latest[s]
      if (r && r.status === 'failed' && new Date(r.started_at).getTime() > dayAgo) {
        attention.push({ text: `${SCRIPT_LABEL[s]} failed ${ago(r.started_at)} — check what broke.`, tab: 'activity', cta: 'See why' })
      }
    }
    setOverview({
      funnel: [
        { label: 'Keywords (new)', value: kwNew },
        { label: 'Drafts (pending)', value: pend },
        { label: 'Approved', value: appr },
        { label: 'Published', value: pub },
        { label: 'Pins', value: pinCount },
      ],
      health: latest,
      events: ev.data || [],
      attention,
      pendingCount: pend,
    })
    return {}
  }, [countWhere])

  const loadContent = useCallback(async (sb) => {
    const r = await safe(sb.from('drafts').select('id,title,category,status,flagged_claims,pin_variants,live_url,created_at').order('created_at', { ascending: false }).limit(200))
    if (!r.error) setDrafts(r.data)
    return r.error ? { error: r.error } : {}
  }, [])

  const loadPins = useCallback(async (sb) => {
    const [p, d] = await Promise.all([
      safe(sb.from('pins').select('*').order('created_at', { ascending: false }).limit(100)),
      safe(sb.from('drafts').select('id,title')),
    ])
    if (p.error) return { error: p.error }
    const titleById = {}
    for (const x of d.data || []) titleById[x.id] = x.title
    setPins((p.data || []).map((x) => ({ ...x, draftTitle: titleById[x.draft_id] || x.title })))
    return {}
  }, [])

  const loadKeywords = useCallback(async (sb) => {
    const r = await safe(sb.from('keyword_candidates').select('id,keyword,score,trend_score,status,created_at').order('created_at', { ascending: false }).limit(80))
    if (!r.error) setKeywords(r.data)
    return r.error ? { error: r.error } : {}
  }, [])

  const loadAi = useCallback(async (sb) => {
    const r = await safe(
      sb.from('pipeline_events').select('message,created_at').ilike('message', '%saved as pending_review via%').order('created_at', { ascending: false }).limit(30)
    )
    if (!r.error) setGenerations(r.data)
    return r.error ? { error: r.error } : {}
  }, [])

  const loadActivity = useCallback(async (sb) => {
    const r = await safe(sb.from('pipeline_events').select('script,message,level,created_at').order('created_at', { ascending: false }).limit(200))
    if (!r.error) setActivity(r.data)
    return r.error ? { error: r.error } : {}
  }, [])

  const loadHealth = useCallback(async (sb) => {
    const tables = ['keyword_candidates', 'drafts', 'draft_revisions', 'pins', 'pipeline_runs', 'pipeline_events', 'pipeline_admins']
    const out = []
    for (const t of tables) {
      const r = await safe(sb.from(t).select('id', { count: 'exact', head: true }).limit(1))
      out.push({ table: t, ok: !r.error, error: r.error || null })
    }
    setHealth(out)
    return {}
  }, [])

  const loadTab = useCallback(async (id) => {
    const sb = await getSupabase()
    if (!sb) return
    setTabLoading(true)
    setMsg('')
    let r = {}
    try {
      if (id === 'overview') r = await loadOverview(sb)
      else if (id === 'content') r = await loadContent(sb)
      else if (id === 'pins') r = await loadPins(sb)
      else if (id === 'keywords') r = await loadKeywords(sb)
      else if (id === 'ai') r = await loadAi(sb)
      else if (id === 'activity') r = await loadActivity(sb)
      else if (id === 'settings') r = await loadHealth(sb)
    } finally {
      setTabLoading(false)
    }
    if (r.error) setMsg(`Couldn't load this tab: ${r.error} — has the pipeline schema been applied in Supabase?`)
  }, [loadOverview, loadContent, loadPins, loadKeywords, loadAi, loadActivity, loadHealth])

  useEffect(() => {
    if (admin) loadTab(tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin, tab])

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(''), 2000)
    } catch {
      setMsg('Copy failed — select the command manually.')
    }
  }

  if (authLoading || admin === null) return <div style={{ padding: 40 }}>Loading dashboard…</div>

  if (!configured || !user) {
    return (
      <div style={{ padding: 40, maxWidth: 560 }}>
        <Seo title="Pipeline dashboard — internal" noindex />
        <h1 style={{ fontFamily: SERIF }}>Growth Pipeline</h1>
        <p>Sign in with the owner Google account to open the dashboard.</p>
        <button style={btn('#1a7a3c')} onClick={signInWithGoogle}>Sign in with Google</button>
      </div>
    )
  }

  if (!admin) {
    return (
      <div style={{ padding: 40, maxWidth: 560 }}>
        <Seo title="Pipeline dashboard — internal" noindex />
        <h1 style={{ fontFamily: SERIF }}>Growth Pipeline</h1>
        <p>This account ({user.email}) is not a pipeline admin.</p>
        <p style={{ fontSize: 13, color: MUTED }}>
          The owner must run this once in Supabase SQL Editor:<br />
          <code>insert into public.pipeline_admins (email) values ('{user.email}') on conflict do nothing;</code>
        </p>
      </div>
    )
  }

  const pendingCount = overview?.pendingCount ?? 0

  return (
    <div style={{ padding: '20px 14px 80px', maxWidth: 1100, margin: '0 auto' }}>
      <Seo title="Growth Pipeline dashboard — internal" description="Internal pipeline control center." noindex />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: TOMATO, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: SERIF, fontWeight: 700, fontSize: 22, flex: 'none' }}>R</div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <h1 style={{ fontFamily: SERIF, margin: 0, fontSize: 22 }}>Growth Pipeline</h1>
          <div style={{ fontSize: 10, color: MUTED, letterSpacing: '.08em', textTransform: 'uppercase' }}>Control center</div>
        </div>
        <button style={{ ...ghostBtn, margin: 0 }} onClick={() => loadTab(tab)}>⟳ Refresh</button>
        <button style={{ ...ghostBtn, margin: 0 }} onClick={signOut}>Sign out</button>
      </div>
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>{user.email}</div>

      <div style={{ display: 'flex', gap: 2, borderBottom: `2px solid ${BORDER}`, margin: '8px 0 4px', overflowX: 'auto', position: 'sticky', top: 0, background: '#faf6ee', zIndex: 5 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
              padding: '12px 14px', color: tab === t.id ? TOMATO : MUTED,
              borderBottom: tab === t.id ? '2px solid #E4572E' : '2px solid transparent',
              marginBottom: -2, whiteSpace: 'nowrap', minHeight: 44,
            }}
          >
            {t.label}
            {t.id === 'review' && pendingCount > 0 && (
              <span style={{ ...pill(TOMATO, '#fff'), marginLeft: 6 }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, margin: '12px 0', background: '#fdecea', fontSize: 14 }}>{msg}</div>
      )}
      {tabLoading && <p style={{ color: MUTED, fontSize: 13 }}>Loading…</p>}

      {tab === 'overview' && overview && (
        <OverviewView data={overview} onCopy={copy} copied={copied} goTab={setTab} />
      )}
      {tab === 'review' && (
        <div style={{ marginTop: 8 }}><ReviewConsole /></div>
      )}
      {tab === 'content' && <ContentView drafts={drafts} />}
      {tab === 'pins' && <PinsView pins={pins} />}
      {tab === 'keywords' && <KeywordsView keywords={keywords} />}
      {tab === 'ai' && <AiView generations={generations} />}
      {tab === 'activity' && <ActivityView events={activity} />}
      {tab === 'settings' && <SettingsView health={health} />}
    </div>
  )
}
