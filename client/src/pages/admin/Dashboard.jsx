import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'
import Seo from '../../components/Seo'
import ReviewConsole from './ReviewConsole'

/**
 * Growth Pipeline Dashboard — the control center. Route: /admin/dashboard.
 *
 * One place to see and do everything:
 *   Overview  — pipeline health at a glance + what happened today + quick actions
 *   Keywords  — what the miner found, scores, statuses
 *   Review    — THE human gate (the full ReviewConsole, embedded)
 *   Published — what's live on the blog + pin status per post
 *   Pins      — the pin queue: scheduled vs live
 *   Activity  — line-by-line feed of what every script did (pipeline_events)
 *   Settings  — connections, table health, daily caps
 *
 * Only emails in `pipeline_admins` may enter. If the pipeline tables don't
 * exist yet (schema not applied), each tab degrades to a friendly hint.
 */

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'keywords', label: 'Keywords' },
  { id: 'review', label: 'Review' },
  { id: 'published', label: 'Published' },
  { id: 'pins', label: 'Pins' },
  { id: 'activity', label: 'Activity' },
  { id: 'settings', label: 'Settings' },
]

const SCRIPTS = ['miner', 'generator', 'publisher', 'scheduler']
const SCRIPT_LABEL = { miner: 'Miner', generator: 'Generator', publisher: 'Publisher', scheduler: 'Scheduler' }
const CHIP = {
  miner: { bg: '#e3efe7', fg: '#1e4633' },
  generator: { bg: '#e7e4f7', fg: '#3e3670' },
  publisher: { bg: '#fbe9e1', fg: '#c24a24' },
  scheduler: { bg: '#e8f0fa', fg: '#2456a6' },
  you: { bg: '#fff3d6', fg: '#8a6d1b' },
}

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

const card = { border: '1px solid #e3d9c8', borderRadius: 12, padding: 16, background: '#fffdf8' }
const num = { fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 700, color: '#1e4633' }
const lbl = { fontSize: 12, color: '#6b5f4d', marginTop: 4 }
const h2 = { fontFamily: 'Georgia, serif', fontSize: 17, margin: '22px 0 10px' }
const pill = (bg, fg) => ({
  display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 10px',
  borderRadius: 12, background: bg, color: fg, whiteSpace: 'nowrap',
})
const btn = (bg) => ({
  padding: '9px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: bg, color: '#fff', fontWeight: 700, fontSize: 13, marginRight: 8, marginBottom: 8,
})
const ghostBtn = {
  padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
  background: '#fffdf8', color: '#1e4633', border: '1px solid #d8cfc2', marginRight: 8, marginBottom: 8,
}

function Empty({ text }) {
  return <p style={{ color: '#6b5f4d', fontSize: 14 }}>{text}</p>
}

function Chip({ script }) {
  const c = CHIP[script] || CHIP.you
  return (
    <span style={{ ...pill(c.bg, c.fg), textTransform: 'uppercase', fontSize: 10, letterSpacing: '.05em' }}>
      {SCRIPT_LABEL[script] || script}
    </span>
  )
}

function statusPill(status) {
  const map = {
    new: ['#e8f0fa', '#2456a6'],
    drafted: ['#fff3d6', '#8a6d1b'],
    published: ['#e3efe7', '#1e4633'],
  }
  const [bg, fg] = map[status] || ['#efe7d6', '#6b5f4d']
  return <span style={pill(bg, fg)}>{status}</span>
}

export default function Dashboard() {
  const { user, loading: authLoading, configured, signInWithGoogle } = useAuth()
  const [admin, setAdmin] = useState(null)
  const [tab, setTab] = useState('overview')
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState('')

  // per-tab data
  const [stats, setStats] = useState(null)
  const [runs, setRuns] = useState(null)
  const [events, setEvents] = useState(null)
  const [keywords, setKeywords] = useState(null)
  const [published, setPublished] = useState(null)
  const [pins, setPins] = useState(null)
  const [activity, setActivity] = useState(null)
  const [activityFilter, setActivityFilter] = useState('all')
  const [health, setHealth] = useState(null)
  const [tabLoading, setTabLoading] = useState(false)

  // ---- admin gate (same rule as the Review Console) ----
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

  const loadOverview = useCallback(async (sb) => {
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()
    const [kw, pend, pub, pn, rn, ev] = await Promise.all([
      safe(sb.from('keyword_candidates').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo)),
      safe(sb.from('drafts').select('id', { count: 'exact', head: true }).eq('status', 'pending_review')),
      safe(sb.from('drafts').select('id', { count: 'exact', head: true }).eq('status', 'published')),
      safe(sb.from('pins').select('id', { count: 'exact', head: true })),
      safe(sb.from('pipeline_runs').select('script,status,started_at,summary').order('started_at', { ascending: false }).limit(40)),
      safe(sb.from('pipeline_events').select('script,message,level,created_at').order('created_at', { ascending: false }).limit(8)),
    ])
    if (kw.error || pend.error) return { error: kw.error || pend.error }
    const latest = {}
    for (const r of rn.data || []) if (!latest[r.script]) latest[r.script] = r
    setStats({ kw: kw.count ?? 0, pend: pend.count ?? 0, pub: pub.count ?? 0, pn: pn.count ?? 0 })
    setRuns(latest)
    setEvents(ev.data || [])
    return {}
  }, [])

  const loadKeywords = useCallback(async (sb) => {
    const r = await safe(
      sb.from('keyword_candidates').select('keyword,score,trend_score,status,created_at').order('created_at', { ascending: false }).limit(60)
    )
    if (r.error) return r
    setKeywords(r.data)
    return {}
  }, [])

  const loadPublished = useCallback(async (sb) => {
    const [d, p] = await Promise.all([
      safe(sb.from('drafts').select('id,title,live_url,created_at').eq('status', 'published').order('created_at', { ascending: false }).limit(60)),
      safe(sb.from('pins').select('draft_id,publish_at,published_at')),
    ])
    if (d.error) return d
    const pinByDraft = {}
    for (const pin of p.data || []) pinByDraft[pin.draft_id] = pin
    setPublished((d.data || []).map((x) => ({ ...x, pin: pinByDraft[x.id] || null })))
    return {}
  }, [])

  const loadPins = useCallback(async (sb) => {
    const [p, d] = await Promise.all([
      safe(sb.from('pins').select('*').order('created_at', { ascending: false }).limit(60)),
      safe(sb.from('drafts').select('id,title')),
    ])
    if (p.error) return p
    const titleById = {}
    for (const x of d.data || []) titleById[x.id] = x.title
    setPins((p.data || []).map((x) => ({ ...x, draftTitle: titleById[x.draft_id] || x.title })))
    return {}
  }, [])

  const loadActivity = useCallback(async (sb) => {
    let query = sb.from('pipeline_events').select('script,message,level,created_at').order('created_at', { ascending: false }).limit(120)
    if (activityFilter !== 'all') query = query.eq('script', activityFilter)
    const r = await safe(query)
    if (r.error) return r
    setActivity(r.data)
    return {}
  }, [activityFilter])

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
      else if (id === 'keywords') r = await loadKeywords(sb)
      else if (id === 'published') r = await loadPublished(sb)
      else if (id === 'pins') r = await loadPins(sb)
      else if (id === 'activity') r = await loadActivity(sb)
      else if (id === 'settings') r = await loadHealth(sb)
    } finally {
      setTabLoading(false)
    }
    if (r.error) setMsg(`Couldn't load this tab: ${r.error} — has the pipeline schema been applied in Supabase?`)
  }, [loadOverview, loadKeywords, loadPublished, loadPins, loadActivity, loadHealth])

  useEffect(() => {
    if (admin) loadTab(tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin, tab])

  useEffect(() => {
    if (admin && tab === 'activity') loadTab('activity')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityFilter])

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
        <h1 style={{ fontFamily: 'Georgia, serif' }}>Growth Pipeline</h1>
        <p>Sign in with the owner Google account to open the dashboard.</p>
        <button style={btn('#1a7a3c')} onClick={signInWithGoogle}>Sign in with Google</button>
      </div>
    )
  }

  if (!admin) {
    return (
      <div style={{ padding: 40, maxWidth: 560 }}>
        <Seo title="Pipeline dashboard — internal" noindex />
        <h1 style={{ fontFamily: 'Georgia, serif' }}>Growth Pipeline</h1>
        <p>This account ({user.email}) is not a pipeline admin.</p>
        <p style={{ fontSize: 13, color: '#6b5f4d' }}>
          The owner must run this once in Supabase SQL Editor:<br />
          <code>insert into public.pipeline_admins (email) values ('{user.email}') on conflict do nothing;</code>
        </p>
      </div>
    )
  }

  const pendingCount = stats?.pend ?? 0

  return (
    <div style={{ padding: '24px 16px 60px', maxWidth: 1060, margin: '0 auto' }}>
      <Seo title="Growth Pipeline dashboard — internal" description="Internal pipeline control center." noindex />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: '#E4572E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 22 }}>R</div>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', margin: 0, fontSize: 24 }}>Growth Pipeline</h1>
          <div style={{ fontSize: 11, color: '#6b5f4d', letterSpacing: '.08em', textTransform: 'uppercase' }}>Control center</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#6b5f4d' }}>{user.email}</div>
      </div>

      <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid #e3d9c8', margin: '12px 0 4px', overflowX: 'auto' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
              padding: '10px 14px', color: tab === t.id ? '#E4572E' : '#6b5f4d',
              borderBottom: tab === t.id ? '2px solid #E4572E' : '2px solid transparent',
              marginBottom: -2, whiteSpace: 'nowrap',
            }}
          >
            {t.label}
            {t.id === 'review' && pendingCount > 0 && (
              <span style={{ ...pill('#E4572E', '#fff'), marginLeft: 6 }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, margin: '12px 0', background: '#fdecea', fontSize: 14 }}>{msg}</div>
      )}
      {tabLoading && <p style={{ color: '#6b5f4d', fontSize: 13 }}>Loading…</p>}

      {tab === 'overview' && stats && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 16 }}>
            <div style={card}><div style={num}>{stats.kw}</div><div style={lbl}>Keywords mined (7d)</div></div>
            <div style={card}><div style={{ ...num, color: pendingCount > 0 ? '#E4572E' : num.color }}>{stats.pend}</div><div style={lbl}>Awaiting your review</div></div>
            <div style={card}><div style={num}>{stats.pub}</div><div style={lbl}>Posts published</div></div>
            <div style={card}><div style={num}>{stats.pn}</div><div style={lbl}>Pins created</div></div>
          </div>

          <h2 style={h2}>Pipeline status</h2>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {SCRIPTS.map((s, i) => {
              const r = runs?.[s]
              const ok = r?.status === 'ok'
              return (
                <React.Fragment key={s}>
                  <div style={{ ...card, minWidth: 150, flex: 1, textAlign: 'center', borderColor: s === 'publisher' && pendingCount > 0 ? '#E4572E' : card.border }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: r ? (ok ? '#1a7a3c' : '#b03a2e') : '#6b5f4d' }}>
                      {r ? (ok ? '● done' : '● failed') : '○ not run yet'}
                    </div>
                    <div style={{ fontWeight: 700, margin: '4px 0', fontSize: 14 }}>{SCRIPT_LABEL[s]}</div>
                    <div style={{ fontSize: 11, color: '#6b5f4d' }}>{r ? ago(r.started_at) : '—'}</div>
                  </div>
                  {i < SCRIPTS.length - 1 && <div style={{ alignSelf: 'center', color: '#b9ac97', fontSize: 18 }}>→</div>}
                </React.Fragment>
              )
            })}
          </div>
          {pendingCount > 0 && (
            <div style={{ ...card, marginTop: 12, borderColor: '#E4572E', background: '#fff7f3' }}>
              <b>{pendingCount} draft{pendingCount === 1 ? '' : 's'} waiting for your review.</b>{' '}
              Nothing publishes until you approve it.{' '}
              <button style={{ ...btn('#E4572E'), margin: '8px 0 0' }} onClick={() => setTab('review')}>Open review</button>
            </div>
          )}

          <h2 style={h2}>Latest activity</h2>
          {(events || []).length === 0 && <Empty text="No pipeline activity yet — run the miner to start the loop." />}
          {(events || []).map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, padding: '9px 0', borderBottom: '1px solid #efe7d6' }}>
              <Chip script={e.script} />
              <span style={{ flex: 1 }}>{e.message}</span>
              <span style={{ fontSize: 11, color: '#6b5f4d', whiteSpace: 'nowrap' }}>{ago(e.created_at)}</span>
            </div>
          ))}
          {events && events.length > 0 && (
            <button style={ghostBtn} onClick={() => setTab('activity')}>Full activity log →</button>
          )}

          <h2 style={h2}>Quick actions</h2>
          <p style={{ fontSize: 13, color: '#6b5f4d', marginTop: 0 }}>
            Scripts run in your terminal (or CI) — these buttons copy the exact command.
          </p>
          {[
            ['miner', 'Run miner now', 'cd pipeline && node --env-file=.env scripts/keyword-miner.mjs'],
            ['generator', 'Generate drafts', 'cd pipeline && LLM_PROVIDER=manual node --env-file=.env scripts/draft-generator.mjs'],
            ['publisher', 'Publish approved', 'cd pipeline && node --env-file=.env scripts/publisher.mjs'],
            ['scheduler', 'Schedule pins', 'cd pipeline && node --env-file=.env scripts/pin-scheduler.mjs'],
          ].map(([key, label, cmd]) => (
            <button key={key} style={ghostBtn} onClick={() => copy(cmd, label)}>
              {copied === label ? '✓ Copied!' : label}
            </button>
          ))}
        </div>
      )}

      {tab === 'keywords' && keywords && (
        <div style={{ marginTop: 16 }}>
          {keywords.length === 0 && <Empty text="No keywords yet — run the miner." />}
          {keywords.map((k, i) => (
            <div key={i} style={{ ...card, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{k.keyword}</div>
                <div style={{ fontSize: 11, color: '#6b5f4d' }}>{fmt(k.created_at)}</div>
              </div>
              <div style={{ width: 90, height: 6, borderRadius: 3, background: '#efe7d6', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, k.score || 0)}%`, height: '100%', background: '#E4572E' }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, width: 30, textAlign: 'right' }}>{k.score ?? '—'}</div>
              {statusPill(k.status)}
            </div>
          ))}
        </div>
      )}

      {tab === 'review' && (
        <div style={{ marginTop: 8 }}>
          <ReviewConsole />
        </div>
      )}

      {tab === 'published' && published && (
        <div style={{ marginTop: 16 }}>
          {published.length === 0 && <Empty text="Nothing published yet — approve a draft in the Review tab first." />}
          {published.map((p) => (
            <div key={p.id} style={{ ...card, marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>{p.title}</div>
              <div style={{ fontSize: 12, margin: '4px 0' }}>
                <a href={p.live_url} target="_blank" rel="noreferrer" style={{ color: '#2456a6' }}>{p.live_url}</a>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#6b5f4d' }}>
                <span>{fmt(p.created_at)}</span>
                {p.pin
                  ? <span style={pill('#e3efe7', '#1e4633')}>{p.pin.publish_at ? `pin scheduled · ${fmt(p.pin.publish_at)}` : 'pin live'}</span>
                  : <span style={pill('#fff3d6', '#8a6d1b')}>no pin yet</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'pins' && pins && (
        <div style={{ marginTop: 16 }}>
          {pins.length === 0 && <Empty text="No pins yet — the scheduler creates them from published posts." />}
          {pins.map((p) => (
            <div key={p.id} style={{ ...card, marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 46, height: 46, borderRadius: 8, background: '#1e4633', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 20, flex: 'none' }}>
                {(p.draftTitle || p.title || 'P')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{p.draftTitle || p.title}</div>
                <div style={{ fontSize: 11, color: '#6b5f4d' }}>Board: {p.board_id} · {p.link}</div>
              </div>
              {p.publish_at
                ? <span style={pill('#fff3d6', '#8a6d1b')}>scheduled · {fmt(p.publish_at)}</span>
                : <span style={pill('#e3efe7', '#1e4633')}>live</span>}
            </div>
          ))}
        </div>
      )}

      {tab === 'activity' && (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 12 }}>
            {['all', ...SCRIPTS].map((s) => (
              <button
                key={s}
                onClick={() => setActivityFilter(s)}
                style={{
                  ...ghostBtn,
                  ...(activityFilter === s ? { background: '#1e4633', color: '#fff', borderColor: '#1e4633' } : {}),
                }}
              >
                {s === 'all' ? 'All' : SCRIPT_LABEL[s]}
              </button>
            ))}
          </div>
          {!activity && <Empty text="No activity yet." />}
          {(activity || []).map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, padding: '9px 0', borderBottom: '1px solid #efe7d6' }}>
              <Chip script={e.script} />
              <span style={{ flex: 1, color: e.level === 'error' ? '#b03a2e' : e.level === 'warn' ? '#8a6d1b' : 'inherit' }}>{e.message}</span>
              <span style={{ fontSize: 11, color: '#6b5f4d', whiteSpace: 'nowrap' }}>{ago(e.created_at)}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'settings' && health && (
        <div style={{ marginTop: 16 }}>
          <h2 style={{ ...h2, marginTop: 0 }}>Pipeline tables</h2>
          {health.map((h) => (
            <div key={h.table} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid #efe7d6', fontSize: 14 }}>
              <code style={{ flex: 1 }}>{h.table}</code>
              {h.ok
                ? <span style={pill('#e3efe7', '#1e4633')}>✓ exists</span>
                : <span style={pill('#fdecea', '#b03a2e')}>✗ missing</span>}
            </div>
          ))}
          {health.some((h) => !h.ok) && (
            <p style={{ fontSize: 13, color: '#6b5f4d' }}>
              Some tables are missing — apply <code>pipeline/supabase/schema-pipeline.sql</code> in the Supabase SQL Editor, then reload.
            </p>
          )}
          <h2 style={h2}>Daily caps</h2>
          <div style={{ fontSize: 14, lineHeight: 2 }}>
            <div>Keywords mined per day: <b>5</b></div>
            <div>Drafts generated per day: <b>3</b></div>
            <div>Hours between pins: <b>6</b></div>
          </div>
          <h2 style={h2}>Secrets</h2>
          <p style={{ fontSize: 13, color: '#6b5f4d' }}>
            API tokens live in <code>pipeline/.env</code> on the machine that runs the scripts — never in this dashboard, never in the browser.
          </p>
        </div>
      )}
    </div>
  )
}
