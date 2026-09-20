import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getSupabase } from '../../lib/supabase'
import Seo from '../../components/Seo'
import ReviewConsole from './ReviewConsole'
import {
  ago, fmt, useCopy, Card, SectionTitle, StatusPill, ScriptChip, LevelPill,
  TabBadge, PrimaryBtn, GhostBtn, EmptyState, StatCard,
} from './ui'

/**
 * Growth Pipeline Dashboard — the control center. Route: /admin/dashboard.
 *
 * Tabs:
 *   Overview — funnel, stats, pipeline health, what needs you, quick actions
 *   Review   — THE human gate (ReviewConsole: preview + edit + approve/reject)
 *   Content  — every draft ever: filter, move between statuses, publish options
 *   Pins     — pin queue: scheduled vs live, per post
 *   Keywords — what the miner found, scores, statuses
 *   AI       — which provider/model wrote what (observability)
 *   Activity — full event log, filterable by script + level
 *   Settings — table health, caps, secrets note
 *
 * Only emails in `pipeline_admins` may enter. Noindex always.
 *
 * Design: mobile-first, single column < 768px, touch targets >= 44px.
 * Palette lock: forest / cream / ember only. Fraunces display + Inter body.
 */

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

/** "Draft X saved as pending_review via openrouter/model:free" -> {title, provider, model} */
export function parseAiEvent(message) {
  const m = /Draft "(.+?)" saved as pending_review via ([^/]+)\/(.+)$/.exec(message || '')
  if (!m) return null
  return { title: m[1], provider: m[2], model: m[3] }
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

function Kicker({ children }) {
  return (
    <p className="mb-1 text-[11px] font-extrabold tracking-[0.14em] text-ember-dark uppercase">{children}</p>
  )
}

/* ============================== OVERVIEW ============================== */

export function OverviewView({ data, goTab, onApproveReady, onReviewOldest, approving }) {
  const { copied, copy } = useCopy()
  const { funnel, health, events, attention } = data

  return (
    <div>
      {attention.length > 0 && (
        <Card className="mt-4 !border-ember-dark/40 !bg-ember-soft/30">
          <Kicker>Needs your attention</Kicker>
          <div className="space-y-2.5">
            {attention.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="flex-1 text-sm text-[#1c2b23]">{a.text}</span>
                <GhostBtn className="!min-h-9 !px-3.5 !text-[13px]" onClick={() => goTab(a.tab)}>
                  {a.cta}
                </GhostBtn>
              </div>
            ))}
          </div>
        </Card>
      )}

      <SectionTitle>Pipeline funnel</SectionTitle>
      {/* mobile: vertical stepper · desktop: horizontal */}
      <div className="md:hidden">
        {funnel.map((f, i) => (
          <React.Fragment key={f.label}>
            <Card className="flex items-center gap-4 !p-3.5">
              <div className="font-display text-[28px] font-bold text-forest">{f.value}</div>
              <div>
                <div className="text-sm font-bold text-[#1c2b23]">{f.label}</div>
                {f.sub && <div className="text-xs text-[#6b5f4d]">{f.sub}</div>}
              </div>
            </Card>
            {i < funnel.length - 1 && (
              <div className="py-1 text-center text-lg text-[#b9ac97]">↓</div>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="hidden items-stretch gap-1.5 md:flex">
        {funnel.map((f, i) => (
          <React.Fragment key={f.label}>
            <Card className="flex-1 !p-3 text-center">
              <div className="font-display text-[28px] font-bold text-forest">{f.value}</div>
              <div className="mt-1 text-xs leading-snug text-[#6b5f4d]">{f.label}</div>
              {f.sub && <div className="text-[10px] text-[#6b5f4d]">{f.sub}</div>}
            </Card>
            {i < funnel.length - 1 && (
              <div className="self-center text-lg text-[#b9ac97]">→</div>
            )}
          </React.Fragment>
        ))}
      </div>

      <SectionTitle>Pipeline health</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SCRIPTS.map((s) => {
          const h = health[s] || {}
          const st = h.status
          const dot = st === 'ok' ? 'bg-[#1a7a3c]' : st === 'failed' ? 'bg-ember-dark' : 'bg-[#b9ac97]'
          const word = st === 'ok' ? 'healthy' : st === 'failed' ? 'failed' : 'not run yet'
          return (
            <Card key={s}>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 flex-none rounded-full ${dot}`} />
                <b className="text-sm text-[#1c2b23]">{SCRIPT_LABEL[s]}</b>
                <span className="ml-auto text-[11px] text-[#6b5f4d]">{word}</span>
              </div>
              <div className="my-1.5 text-xs text-[#6b5f4d]">{SCRIPT_DESC[s]}</div>
              <div className="text-xs text-[#1c2b23]">
                {h.started_at ? (
                  <>Last run <b>{ago(h.started_at)}</b>{h.summaryText ? <><br /><span className="text-[#6b5f4d]">{h.summaryText}</span></> : null}</>
                ) : (
                  <span className="text-[#6b5f4d]">No runs recorded yet</span>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <SectionTitle>Latest activity</SectionTitle>
      {events.length === 0 && (
        <EmptyState
          icon="🌱"
          title="No activity yet"
          text="The pipeline hasn't run. Start the loop: mine keywords, then generate drafts."
          actionLabel="⛏ Copy: run the miner"
          actionDoneLabel="✓ Copied!"
          onAction={() => copy('node pipeline/scripts/keyword-miner.mjs', 'miner')}
        />
      )}
      {events.length > 0 && (
        <Card className="!p-0 overflow-hidden">
          {events.map((e, i) => (
            <div key={i} className={`flex items-start gap-2.5 px-3.5 py-2.5 text-[13px] ${i > 0 ? 'border-t border-cream-dark' : ''}`}>
              <ScriptChip script={e.script} />
              <span className={`flex-1 ${e.level === 'error' ? 'text-ember-dark' : e.level === 'warn' ? 'text-ember-dark' : 'text-[#1c2b23]'}`}>{e.message}</span>
              <span className="text-[11px] whitespace-nowrap text-[#6b5f4d]">{ago(e.created_at)}</span>
            </div>
          ))}
        </Card>
      )}
      {events.length > 0 && (
        <div className="mt-3"><GhostBtn onClick={() => goTab('activity')}>Full activity log →</GhostBtn></div>
      )}

      <SectionTitle>Quick actions</SectionTitle>
      <p className="mt-0 mb-3 text-[13px] text-[#6b5f4d]">
        Real actions — they run right here, on your phone. No terminal needed.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <GhostBtn className="justify-start !font-semibold" onClick={onApproveReady} disabled={approving}>
          {approving ? '⏳ Approving…' : '✅ Approve all ready'}
        </GhostBtn>
        <p className="-mt-1 mb-1 text-[12px] text-[#6b5f4d]">
          Approves pending drafts that pass every check (image set, your own note, no unverified claims). Anything needing eyes stays in review.
        </p>
        <GhostBtn className="justify-start !font-semibold" onClick={onReviewOldest}>
          🔍 Review oldest pending
        </GhostBtn>
        <GhostBtn className="justify-start !font-semibold" onClick={() => goTab('keywords')}>
          ➕ Keywords — add your own
        </GhostBtn>
        <GhostBtn className="justify-start !font-semibold" onClick={() => copy('node pipeline/scripts/publisher.mjs', 'pub-cmd')}>
          {copied === 'pub-cmd' ? '✓ Copied!' : '💻 Copy: publish from a computer'}
        </GhostBtn>
      </div>
    </div>
  )
}

/* ============================== CONTENT ============================== */

const CONTENT_FILTERS = ['all', 'pending_review', 'approved', 'rejected', 'published']

/** Publish controls for an approved draft. Publishing itself runs in the
 *  terminal (publisher.mjs) or the daily GitHub Action — there is no browser
 *  endpoint, so "now / schedule" are shown disabled with the honest reason,
 *  plus a working copy-command button. */
function PublishPanel({ draft }) {
  const { copied, copy } = useCopy()
  const [open, setOpen] = useState(false)
  const [when, setWhen] = useState('')
  return (
    <div className="mt-2.5 rounded-xl bg-forest-soft/50 p-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex min-h-11 w-full items-center justify-between text-sm font-bold text-forest"
      >
        <span>🚀 Publish options</span>
        <span className="text-[#6b5f4d]">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="pt-1">
          <div className="flex flex-wrap gap-2">
            <button
              disabled
              title="No browser endpoint — the publisher runs in your terminal or the daily GitHub Action"
              className="inline-flex min-h-11 cursor-not-allowed items-center rounded-xl bg-forest px-4 text-sm font-bold text-white opacity-50"
            >
              Publish now
            </button>
            <div className="flex min-h-11 items-center gap-2 rounded-xl border border-forest-line bg-cream-card px-3 opacity-60">
              <input
                type="datetime-local"
                disabled
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                title="Scheduling needs a backend endpoint that doesn't exist yet"
                className="cursor-not-allowed bg-transparent text-sm text-[#6b5f4d]"
              />
              <button disabled title="Scheduling needs a backend endpoint that doesn't exist yet"
                className="cursor-not-allowed text-sm font-bold text-[#6b5f4d]">
                Schedule
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#6b5f4d]">
            One-click publish & scheduling need a backend endpoint that doesn't exist yet — the publisher
            is a terminal script (<code>pipeline/scripts/publisher.mjs</code>) plus a daily 06:00 UTC GitHub
            Action. Until it's wired, run it yourself:
          </p>
          <div className="mt-2">
            <GhostBtn className="!min-h-11 !text-[13px]" onClick={() => copy('node pipeline/scripts/publisher.mjs', 'publisher-cmd')}>
              {copied === 'publisher-cmd' ? '✓ Copied!' : '📋 Copy: publish approved now'}
            </GhostBtn>
          </div>
        </div>
      )}
    </div>
  )
}

function DraftCard({ draft, onReview, onMoveStatus, moving }) {
  const fc = (draft.flagged_claims || []).length
  return (
    <Card className="mb-3 !p-3.5">
      <div className="flex items-start gap-3">
        {draft.image ? (
          <img src={draft.image} alt="" loading="lazy" className="h-16 w-16 flex-none rounded-xl object-cover" />
        ) : (
          <div className="font-display flex h-16 w-16 flex-none items-center justify-center rounded-xl bg-forest-soft text-xl font-bold text-forest">
            {(draft.title || 'R')[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-[#1c2b23]">{draft.title || '(untitled)'}</div>
          <div className="mt-1 text-xs text-[#6b5f4d]">
            {draft.category} · {fc} flagged · {(draft.pin_variants || []).length} pin variants · {ago(draft.created_at)}
          </div>
          {draft.status === 'published' && draft.live_url && (
            <div className="mt-1 text-xs">
              <a href={draft.live_url} target="_blank" rel="noreferrer" className="font-semibold text-forest underline">
                View live post →
              </a>
            </div>
          )}
        </div>
        <StatusPill status={draft.status} />
      </div>

      {/* per-status actions — a draft is never stuck */}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {draft.status === 'pending_review' && (
          <GhostBtn className="!min-h-11 !text-[13px]" onClick={() => onReview(draft.id)}>
            👁 Review →
          </GhostBtn>
        )}
        {draft.status === 'approved' && (
          <GhostBtn className="!min-h-11 !text-[13px]" disabled={moving} onClick={() => onMoveStatus(draft, 'pending_review')}>
            ↩ {moving ? 'Moving…' : 'Back to review'}
          </GhostBtn>
        )}
        {draft.status === 'rejected' && (
          <GhostBtn className="!min-h-11 !text-[13px]" disabled={moving} onClick={() => onMoveStatus(draft, 'pending_review')}>
            ↩ {moving ? 'Restoring…' : 'Restore to review'}
          </GhostBtn>
        )}
      </div>
      {draft.status === 'approved' && <PublishPanel draft={draft} />}
    </Card>
  )
}

export function ContentView({ drafts, onReview, onMoveStatus, movingId }) {
  const [filter, setFilter] = useState('all')
  const { copied, copy } = useCopy()
  const list = (drafts || []).filter((d) => filter === 'all' || d.status === filter)
  const counts = {}
  for (const d of drafts || []) counts[d.status] = (counts[d.status] || 0) + 1
  return (
    <div className="mt-4">
      <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {CONTENT_FILTERS.map((f) => (
          <GhostBtn
            key={f}
            active={filter === f}
            className="!text-[13px] whitespace-nowrap"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? `All (${(drafts || []).length})` : `${f.replace(/_/g, ' ')} (${counts[f] || 0})`}
          </GhostBtn>
        ))}
      </div>
      {list.length === 0 && (
        <EmptyState
          icon="📝"
          title={filter === 'all' ? 'No drafts yet' : `No ${filter.replace(/_/g, ' ')} drafts`}
          text={filter === 'all'
            ? 'Run the generator to create your first AI drafts — they will appear here and in the Review queue.'
            : 'Nothing with this status right now.'}
          actionLabel={filter === 'all' ? (copied === 'generator-cmd' ? '✓ Copied!' : '✍ Copy: run the generator') : undefined}
          actionDoneLabel={undefined}
          onAction={filter === 'all' ? () => copy('node pipeline/scripts/draft-generator.mjs', 'generator-cmd') : undefined}
        />
      )}
      {list.map((d) => (
        <DraftCard key={d.id} draft={d} onReview={onReview} onMoveStatus={onMoveStatus} moving={movingId === d.id} />
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
    <Card className="mb-2.5 flex items-center gap-3 !p-3">
      <div className="font-display flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-forest text-lg font-bold text-white">
        {(p.draftTitle || p.title || 'P')[0].toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-[#1c2b23]">{p.draftTitle || p.title}</div>
        <div className="truncate text-[11px] text-[#6b5f4d]">Board: {p.board_id}</div>
        <div className="text-[11px] text-[#6b5f4d]">
          {p.published_at ? `went live ${ago(p.published_at)}` : p.publish_at ? `scheduled for ${fmt(p.publish_at)}` : 'publish time not set'}
        </div>
      </div>
      {p.published_at
        ? <span className="inline-block rounded-full bg-forest px-2.5 py-1 text-[11px] font-bold text-white whitespace-nowrap">live</span>
        : p.publish_at
          ? <span className="inline-block rounded-full bg-ember-soft px-2.5 py-1 text-[11px] font-bold text-ember-dark whitespace-nowrap">scheduled</span>
          : <span className="inline-block rounded-full bg-forest-soft px-2.5 py-1 text-[11px] font-bold text-forest whitespace-nowrap">queued</span>}
    </Card>
  )
  return (
    <div className="mt-4">
      <div className="mb-2 grid grid-cols-3 gap-2.5">
        <StatCard value={scheduled.length} label="Scheduled" accent="#c7431f" />
        <StatCard value={live.length} label="Live on Pinterest" />
        <StatCard value={immediate.length} label="Queued" accent="#1e4633" />
      </div>
      {(pins || []).length === 0 && (
        <EmptyState
          icon="📌"
          title="No pins yet"
          text="The scheduler creates pins from published posts. Publish something first, then schedule pins for it."
        />
      )}
      {scheduled.length > 0 && <><SectionTitle>Scheduled</SectionTitle>{scheduled.map((p) => <PinCard key={p.id} p={p} />)}</>}
      {live.length > 0 && <><SectionTitle>Live</SectionTitle>{live.map((p) => <PinCard key={p.id} p={p} />)}</>}
      {immediate.length > 0 && <><SectionTitle>Queued</SectionTitle>{immediate.map((p) => <PinCard key={p.id} p={p} />)}</>}
    </div>
  )
}

/* ============================== KEYWORDS ============================== */

export function KeywordsView({ keywords, onAdd }) {
  const [val, setVal] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setErr('')
    try {
      await onAdd(val)
      setVal('')
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4">
      <Card className="mb-3 !p-3.5">
        <Kicker>Add your own keyword</Kicker>
        <p className="mt-1 mb-2.5 text-[13px] text-[#6b5f4d]">
          Got an idea from Pinterest or TikTok? Add it here — the AI drafts from it next.
          (The Pinterest miner needs trial approval; the news backup runs automatically.)
        </p>
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="e.g. high protein lentil soup"
            className="min-h-[44px] flex-1 rounded-xl border border-cream-dark bg-white px-3.5 text-[15px] text-[#1c2b23] outline-none placeholder:text-[#a89a83] focus:border-forest"
          />
          <button
            type="submit"
            disabled={busy}
            className="min-h-[44px] flex-none rounded-xl bg-forest px-5 text-[15px] font-bold text-white disabled:opacity-50"
          >
            {busy ? '…' : 'Add'}
          </button>
        </form>
        {err && <p className="mt-2 text-[13px] text-ember-dark">{err}</p>}
      </Card>
      {(keywords || []).length === 0 && (
        <EmptyState
          icon="🔍"
          title="No keywords yet"
          text="Add your first keyword above, or wait for the automatic news scan."
        />
      )}
      {(keywords || []).map((k, i) => (
        <Card key={k.id || i} className="mb-2.5 !p-3.5">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-[#1c2b23]">{k.keyword}</div>
              <div className="mt-0.5 text-[11px] text-[#6b5f4d]">
                mined {ago(k.created_at)}
                {k.trend_score != null && <> · trend {Math.round(k.trend_score)}</>}
              </div>
            </div>
            <div className="h-1.5 w-20 flex-none overflow-hidden rounded-full bg-cream-dark">
              <div className="h-full rounded-full bg-ember" style={{ width: `${Math.min(100, k.score || 0)}%` }} />
            </div>
            <div className="w-9 flex-none text-right text-xs font-bold text-[#1c2b23]">{k.score ?? '—'}</div>
            <StatusPill status={k.status} />
          </div>
        </Card>
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
    <div className="mt-4">
      <Kicker>Provider chain</Kicker>
      <p className="mt-0 mb-3 text-[13px] text-[#6b5f4d]">
        The writer tries providers top-down and uses the first one that answers. Any provider without a key is skipped silently.
      </p>
      {CHAIN.map((c, i) => (
        <Card key={c.id} className="mb-2.5 flex items-start gap-3 !p-3.5">
          <div className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[13px] font-extrabold ${i === 0 ? 'bg-cream-dark text-[#6b5f4d]' : 'bg-forest text-white'}`}>
            {i + 1}
          </div>
          <div>
            <div className="font-bold text-[#1c2b23]">{c.name}</div>
            <div className="text-xs text-[#6b5f4d]">{c.note}</div>
          </div>
        </Card>
      ))}

      <SectionTitle>What the AI wrote recently</SectionTitle>
      {gens.length === 0 && (
        <EmptyState
          icon="🤖"
          title="No AI generations logged"
          text="When the generator writes drafts, each one is logged here with the provider and model that wrote it."
        />
      )}
      {gens.map((g, i) => (
        <Card key={i} className="mb-2.5 !p-3.5">
          <div className="text-sm font-bold text-[#1c2b23]">{g.parsed.title}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full bg-forest-soft px-2.5 py-1 text-[11px] font-bold text-forest">{g.parsed.provider}</span>
            <code className="text-[11px] text-[#6b5f4d]">{g.parsed.model}</code>
            <span className="ml-auto text-[11px] text-[#6b5f4d]">{ago(g.created_at)}</span>
          </div>
        </Card>
      ))}

      {Object.keys(byModel).length > 0 && (
        <>
          <SectionTitle>Model usage</SectionTitle>
          <Card className="!p-0 overflow-hidden">
            {Object.entries(byModel).sort((a, b) => b[1] - a[1]).map(([m, n], i) => (
              <div key={m} className={`flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] ${i > 0 ? 'border-t border-cream-dark' : ''}`}>
                <code className="flex-1 text-xs text-[#1c2b23]">{m}</code>
                <b className="text-[#1c2b23]">{n} draft{n === 1 ? '' : 's'}</b>
              </div>
            ))}
          </Card>
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
  return (
    <div className="mt-4">
      <div className="no-scrollbar -mx-1 mb-2.5 flex gap-2 overflow-x-auto px-1 pb-1">
        {['all', ...SCRIPTS].map((s) => (
          <GhostBtn key={s} active={script === s} className="!text-[13px] whitespace-nowrap" onClick={() => setScript(s)}>
            {s === 'all' ? 'All scripts' : SCRIPT_LABEL[s]}
          </GhostBtn>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {['all', 'info', 'warn', 'error'].map((l) => (
          <GhostBtn key={l} active={level === l} className="!min-h-9 !px-3.5 !text-[13px]" onClick={() => setLevel(l)}>
            {l === 'all' ? 'All levels' : l}
          </GhostBtn>
        ))}
      </div>
      {list.length === 0 && (
        <EmptyState icon="📜" title="No events match" text="Try widening the filters — or run a pipeline script to generate activity." />
      )}
      {list.length > 0 && (
        <Card className="!p-0 overflow-hidden">
          {list.map((e, i) => (
            <div key={i} className={`flex items-start gap-2.5 px-3.5 py-2.5 text-[13px] ${i > 0 ? 'border-t border-cream-dark' : ''}`}>
              <ScriptChip script={e.script} />
              <span className="flex-1 text-[#1c2b23]">{e.message}</span>
              <LevelPill level={e.level} />
              <span className="hidden text-[11px] whitespace-nowrap text-[#6b5f4d] sm:inline">{ago(e.created_at)}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

/* ============================== SETTINGS ============================== */

export function SettingsView({ health }) {
  return (
    <div className="mt-4">
      <Kicker>Pipeline tables</Kicker>
      <Card className="!p-0 overflow-hidden">
        {(health || []).map((h, i) => (
          <div key={h.table} className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm ${i > 0 ? 'border-t border-cream-dark' : ''}`}>
            <code className="flex-1 text-[#1c2b23]">{h.table}</code>
            {h.ok
              ? <span className="inline-block rounded-full bg-forest-soft px-2.5 py-1 text-[11px] font-bold text-forest whitespace-nowrap">✓ exists</span>
              : <span className="inline-block rounded-full bg-ember-dark px-2.5 py-1 text-[11px] font-bold text-white whitespace-nowrap">✗ {h.error || 'missing'}</span>}
          </div>
        ))}
      </Card>
      {(health || []).some((h) => !h.ok) && (
        <p className="mt-2 text-[13px] text-[#6b5f4d]">
          Some tables are missing — apply <code>pipeline/supabase/schema-pipeline.sql</code> in the Supabase SQL Editor, then reload.
        </p>
      )}
      <SectionTitle>Daily caps</SectionTitle>
      <Card>
        <div className="space-y-1.5 text-sm text-[#1c2b23]">
          <div className="flex justify-between"><span>Keywords mined per day</span><b>5</b></div>
          <div className="flex justify-between"><span>Drafts generated per day</span><b>3</b></div>
          <div className="flex justify-between"><span>Hours between pins</span><b>6</b></div>
        </div>
      </Card>
      <p className="mt-2 text-xs text-[#6b5f4d]">Caps are set in the pipeline scripts' env vars — ask Neo to change them.</p>
      <SectionTitle>Secrets</SectionTitle>
      <Card>
        <p className="m-0 text-[13px] leading-relaxed text-[#6b5f4d]">
          API tokens live in the gitignored <code>.env</code> on the machine that runs the scripts — never in this
          dashboard, never in the browser. The AI chain needs <code>OPENROUTER_API_KEY</code> and/or{' '}
          <code>NVIDIA_API_KEY</code>; the pipeline needs <code>SUPABASE_URL</code> +{' '}
          <code>SUPABASE_SERVICE_KEY</code>; the scheduler needs <code>PINTEREST_ACCESS_TOKEN</code>; image
          generation needs <code>HF_TOKEN</code> or <code>POLLINATIONS_API_KEY</code>.
        </p>
      </Card>
    </div>
  )
}

/* ============================== CONTAINER ============================== */

export default function Dashboard() {
  const { user, loading: authLoading, configured, signInWithGoogle, signOut } = useAuth()
  const [admin, setAdmin] = useState(null)
  const [tab, setTab] = useState('overview')
  const [msg, setMsg] = useState('')
  const [tabLoading, setTabLoading] = useState(false)
  const [reviewFocus, setReviewFocus] = useState(null)
  const [movingId, setMovingId] = useState(null)
  const [approving, setApproving] = useState(false)

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
  }, [countWhere])

  const loadContent = useCallback(async (sb) => {
    const r = await safe(sb.from('drafts').select('id,title,category,status,flagged_claims,pin_variants,image,live_url,created_at').order('created_at', { ascending: false }).limit(200))
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

  /** Move a draft between statuses (approved/rejected -> pending_review).
   *  Logged to draft_revisions so the audit trail stays complete. */
  const moveDraftStatus = useCallback(async (draft, toStatus) => {
    setMovingId(draft.id)
    setMsg('')
    try {
      const sb = await getSupabase()
      if (!sb) throw new Error('Supabase not configured')
      const { error } = await sb.from('drafts').update({ status: toStatus }).eq('id', draft.id)
      if (error) throw error
      await sb.from('draft_revisions').insert({
        draft_id: draft.id,
        edited_by: user.id,
        diff: { status: { before: draft.status, after: toStatus } },
      })
      setMsg(`✓ "${draft.title}" moved back to review.`)
      const sb2 = await getSupabase()
      if (sb2) {
        await loadOverview(sb2)
        await loadContent(sb2)
      }
    } catch (e) {
      if (/PIPELINE GUARDRAIL/i.test(e.message)) {
        setMsg('The database still blocks approved → review. Apply pipeline/supabase/migrations/allow-approved-back-to-review.sql in the Supabase SQL Editor once, then try again. (Ask Neo.)')
      } else {
        setMsg(`Couldn't move the draft: ${e.message}`)
      }
    } finally {
      setMovingId(null)
    }
  }, [user, loadOverview, loadContent])

  /** Bulk-approve every pending draft that passes the full checklist
   *  (image set, own personal note, zero unverified claims). Same rules as the
   *  Review approve button — anything needing eyes stays pending. */
  const approveAllReady = useCallback(async () => {
    setApproving(true)
    setMsg('')
    try {
      const sb = await getSupabase()
      if (!sb) throw new Error('Supabase not configured')
      const { data, error } = await sb
        .from('drafts')
        .select('id,title,personal_note,image,flagged_claims')
        .eq('status', 'pending_review')
      if (error) throw error
      const ready = (data || []).filter((d) => {
        const note = (d.personal_note || '').trim()
        return (
          (d.image || '').trim().length > 0 &&
          note.length > 0 &&
          !note.includes('TODO_KHALIL') &&
          (d.flagged_claims || []).length === 0
        )
      })
      const skipped = (data || []).length - ready.length
      if (ready.length === 0) {
        setMsg(
          skipped > 0
            ? `Nothing to bulk-approve — ${skipped} draft${skipped === 1 ? '' : 's'} need${skipped === 1 ? 's' : ''} your eyes first (claims, note, or image).`
            : 'No pending drafts.'
        )
        return
      }
      const now = new Date().toISOString()
      for (const d of ready) {
        const { error: e } = await sb
          .from('drafts')
          .update({ status: 'approved', reviewer_id: user.id, reviewed_at: now })
          .eq('id', d.id)
        if (e) throw e
        await sb.from('draft_revisions').insert({
          draft_id: d.id,
          edited_by: user.id,
          diff: { status: { before: 'pending_review', after: 'approved' }, via: 'bulk-approve-ready' },
        })
      }
      setMsg(
        `✓ Approved ${ready.length} draft${ready.length === 1 ? '' : 's'}.${skipped > 0 ? ` ${skipped} skipped — need${skipped === 1 ? 's' : ''} manual check.` : ''}`
      )
      const sb2 = await getSupabase()
      if (sb2) await loadOverview(sb2)
    } catch (e) {
      setMsg(`Couldn't bulk-approve: ${e.message}`)
    } finally {
      setApproving(false)
    }
  }, [user, loadOverview])

  /** Jump to the oldest pending draft in Review. */
  const reviewOldestPending = useCallback(async () => {
    setMsg('')
    try {
      const sb = await getSupabase()
      if (!sb) throw new Error('Supabase not configured')
      const { data, error } = await sb
        .from('drafts')
        .select('id')
        .eq('status', 'pending_review')
        .order('created_at', { ascending: true })
        .limit(1)
      if (error) throw error
      if (data && data[0]) {
        setReviewFocus(data[0].id)
        setTab('review')
      } else {
        setMsg('No pending drafts — nothing to review.')
      }
    } catch (e) {
      setMsg(`Couldn't open review: ${e.message}`)
    }
  }, [])

  /** Manually add a keyword candidate (your own idea, no miner needed). */
  const addKeyword = useCallback(async (kw) => {
    const sb = await getSupabase()
    if (!sb) throw new Error('Supabase not configured')
    const text = (kw || '').trim().toLowerCase()
    if (!text) throw new Error('Type a keyword first')
    const runId = 'manual-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const { error } = await sb
      .from('keyword_candidates')
      .insert({ keyword: text, status: 'new', source_run_id: runId })
    if (error) throw error
    const sb2 = await getSupabase()
    if (sb2) {
      await loadKeywords(sb2)
      await loadOverview(sb2)
    }
  }, [loadKeywords, loadOverview])

  const loadTab = useCallback(async (id) => {
    const sb = await getSupabase()
    if (!sb) return
    setTabLoading(true)
    setMsg('')
    let r = {}
    try {
      await loadOverview(sb) // always refresh: tab badges + attention stay live
      if (id === 'content') r = await loadContent(sb)
      else if (id === 'pins') r = await loadPins(sb)
      else if (id === 'keywords') r = await loadKeywords(sb)
      else if (id === 'ai') r = await loadAi(sb)
      else if (id === 'activity') r = await loadActivity(sb)
      else if (id === 'settings') r = await loadHealth(sb)
      // 'review' and 'overview' need nothing beyond the overview refresh
    } finally {
      setTabLoading(false)
    }
    if (r.error) setMsg(`Couldn't load this tab: ${r.error} — has the pipeline schema been applied in Supabase?`)
  }, [loadOverview, loadContent, loadPins, loadKeywords, loadAi, loadActivity, loadHealth])

  useEffect(() => {
    if (admin) loadTab(tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin, tab])

  const goTab = useCallback((id) => setTab(id), [])

  if (authLoading || admin === null) {
    return <div className="p-10 text-[#6b5f4d]">Loading dashboard…</div>
  }

  if (!configured || !user) {
    return (
      <div className="max-w-xl p-10">
        <Seo title="Pipeline dashboard — internal" noindex />
        <h1 className="font-display text-3xl font-semibold text-forest">Growth Pipeline</h1>
        <p className="mt-2 text-[#1c2b23]">Sign in with the owner Google account to open the dashboard.</p>
        <div className="mt-4"><PrimaryBtn onClick={signInWithGoogle}>Sign in with Google</PrimaryBtn></div>
      </div>
    )
  }

  if (!admin) {
    return (
      <div className="max-w-xl p-10">
        <Seo title="Pipeline dashboard — internal" noindex />
        <h1 className="font-display text-3xl font-semibold text-forest">Growth Pipeline</h1>
        <p className="mt-2">This account ({user.email}) is not a pipeline admin.</p>
        <Card className="mt-4">
          <p className="m-0 text-[13px] text-[#6b5f4d]">
            The owner must run this once in Supabase SQL Editor:<br />
            <code className="text-xs">insert into public.pipeline_admins (email) values ('{user.email}') on conflict do nothing;</code>
          </p>
        </Card>
      </div>
    )
  }

  const pendingCount = overview?.pendingCount ?? 0

  return (
    <div className="mx-auto max-w-5xl px-3.5 pb-28 sm:px-5">
      <Seo title="Growth Pipeline dashboard — internal" description="Internal pipeline control center." noindex />

      {/* header */}
      <div className="flex items-center gap-3 pt-5">
        <div className="font-display flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-ember-dark text-[22px] font-bold text-white">
          R
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display m-0 text-[22px] leading-tight font-semibold text-forest">Growth Pipeline</h1>
          <div className="text-[10px] tracking-[0.14em] text-[#6b5f4d] uppercase">Control center</div>
        </div>
        <GhostBtn className="!min-h-11 !px-3.5 !text-[13px]" onClick={() => loadTab(tab)}>⟳ Refresh</GhostBtn>
        <GhostBtn className="!min-h-11 !px-3.5 !text-[13px]" onClick={signOut}>Sign out</GhostBtn>
      </div>
      <div className="mt-1 mb-1 text-[11px] text-[#6b5f4d]">{user.email}</div>

      {/* tab bar — sticky, swipeable, badges */}
      <div className="sticky top-0 z-30 -mx-3.5 border-b border-forest-line bg-cream/95 px-3.5 backdrop-blur sm:-mx-5 sm:px-5">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto py-2.5">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex min-h-11 flex-none items-center rounded-full px-4 text-sm font-bold whitespace-nowrap active:scale-[0.98] ${
                  active ? 'bg-forest text-white' : 'bg-cream-card text-[#6b5f4d] ring-1 ring-forest-line'
                }`}
              >
                {t.label}
                {t.id === 'review' && <TabBadge count={pendingCount} />}
                {t.id === 'content' && <TabBadge count={pendingCount} />}
              </button>
            )
          })}
        </div>
      </div>

      {msg && (
        <div className={`mt-3 rounded-xl px-3.5 py-2.5 text-sm ${msg.startsWith("Couldn't") || msg.startsWith('The database') ? 'bg-ember-soft text-ember-dark' : 'bg-forest-soft text-forest'}`}>
          {msg}
        </div>
      )}
      {tabLoading && <p className="mt-3 text-[13px] text-[#6b5f4d]">Loading…</p>}

      {tab === 'overview' && overview && (
        <OverviewView
          data={overview}
          goTab={goTab}
          onApproveReady={approveAllReady}
          onReviewOldest={reviewOldestPending}
          approving={approving}
        />
      )}
      {tab === 'review' && (
        <div className="mt-4">
          <ReviewConsole focusId={reviewFocus} onFocusHandled={() => setReviewFocus(null)} />
        </div>
      )}
      {tab === 'content' && (
        <ContentView
          drafts={drafts}
          onReview={(id) => { setReviewFocus(id); setTab('review') }}
          onMoveStatus={moveDraftStatus}
          movingId={movingId}
        />
      )}
      {tab === 'pins' && <PinsView pins={pins} />}
      {tab === 'keywords' && <KeywordsView keywords={keywords} onAdd={addKeyword} />}
      {tab === 'ai' && <AiView generations={generations} />}
      {tab === 'activity' && <ActivityView events={activity} />}
      {tab === 'settings' && <SettingsView health={health} />}
    </div>
  )
}
