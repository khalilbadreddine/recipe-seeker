import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getSupabase } from '../../lib/supabase'
import Seo from '../../components/Seo'
import {
  ago, useCopy, Card, SectionTitle, StatusPill, EmptyState,
  PrimaryBtn, DangerBtn, GhostBtn, inputCls, labelCls,
} from './ui'

/**
 * Review Console — THE human gate of the content pipeline.
 * Route: /admin/review (internal only). Also embedded in /admin/dashboard.
 *
 * Only emails listed in the `pipeline_admins` table may use it.
 * Actions: approve / edit / reject on drafts with status='pending_review'.
 * Every edit writes a {before, after} diff to `draft_revisions` — the audit
 * trail of LLM output vs. what actually shipped.
 *
 * Approval checklist (client-side; server re-checks):
 *   - every flagged numeric claim ticked as verified
 *   - personal note present and real (AI-written in Emily Carter's voice;
 *     the TODO_KHALIL placeholder still blocks)
 *   - hero image set (auto-generated at draft time; replaceable)
 *
 * Props:
 *   focusId — optional draft id to auto-open (used by the dashboard's
 *             Content tab "Review" deep-link). onFocusHandled clears it.
 *   onRegenerateImage — optional handler for the regenerate-image button.
 *             No backend endpoint exists yet, so the button is disabled with
 *             an explanation (needs HF_TOKEN or POLLINATIONS_API_KEY).
 */

const CATEGORIES = ['Iron', 'Protein', 'Calcium', 'Vitamin C', 'Zinc', 'Fiber', 'Meal Prep', 'Breakfast']
const TODO_MARK = 'TODO_KHALIL'

function diffObjects(before, after) {
  const diff = {}
  for (const key of Object.keys(after)) {
    const b = JSON.stringify(before[key] ?? null)
    const a = JSON.stringify(after[key] ?? null)
    if (b !== a) diff[key] = { before: before[key] ?? null, after: after[key] ?? null }
  }
  return diff
}

/* ------------------------- pin variant with copy ------------------------- */

function PinVariantCard({ variant, index }) {  const { copied, copy } = useCopy()
  const key = `pin-${index}`
  const text = `${variant.title}\n\n${variant.description}`
  return (
    <div className="rounded-xl border border-forest-line bg-cream p-3">
      <div className="text-[13px] font-bold text-[#1c2b23]">{variant.title}</div>
      <div className="mt-1.5 text-xs leading-relaxed text-[#6b5f4d]">{variant.description}</div>
      <button
        onClick={() => copy(text, key)}
        className="mt-2.5 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-forest-line bg-cream-card px-3.5 text-[13px] font-bold text-forest active:scale-[0.98]"
      >
        {copied === key ? '✓ Copied — paste it into Pinterest' : '📋 Copy pin text'}
      </button>
    </div>
  )
}

/* ------------------------- per-piece AI regeneration (TODO) -------------------------
   No backend endpoint exists for single-piece regeneration yet — the generator
   script rebuilds whole drafts in the terminal. These buttons are deliberately
   disabled with an explanation of what's missing. Props let a future endpoint
   plug in without touching the UI. */
function RegenerateGroup({ regen, setMsg }) {
  const todo = (piece) => () =>
    setMsg(
      `Regenerating just the ${piece} isn't wired yet — the generator runs in your terminal and rebuilds the whole draft. Ask Neo to wire single-piece regeneration.`
    )
  const items = [
    { key: 'note', label: '↻ Note', handler: regen?.onNote },
    { key: 'image', label: '↻ Image', handler: regen?.onImage },
    { key: 'pins', label: '↻ Pin variants', handler: regen?.onPins },
  ]
  return (
    <div className="mt-5 rounded-xl border border-dashed border-forest-line bg-cream p-3.5">
      <div className="mb-2 text-[11px] font-extrabold tracking-wide text-[#6b5f4d] uppercase">
        Regenerate with AI — one piece at a time
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <button
            key={it.key}
            disabled
            title="Not wired yet — needs a backend endpoint"
            onClick={it.handler || todo(it.key)}
            className="inline-flex min-h-11 cursor-not-allowed items-center gap-1.5 rounded-xl border border-forest-line bg-cream-card px-4 text-[13px] font-bold text-[#6b5f4d] opacity-70"
          >
            {it.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[#6b5f4d]">
        Single-piece regeneration needs a backend endpoint that doesn't exist yet. The image also needs{' '}
        <b>HF_TOKEN</b> or <b>POLLINATIONS_API_KEY</b> on the machine that runs the generator. Ask Neo to wire it —
        or edit any piece by hand in Edit mode.
      </p>
    </div>
  )
}

/* ------------------------- rendered preview ------------------------- */

export function Preview({ draft, regen, setMsg }) {
  const body = draft.body || {}
  const sections = body.sections || []
  const faqs = body.faqs || []
  const hasTodo = (draft.personal_note || '').includes(TODO_MARK)
  return (
    <div className="mb-4 rounded-2xl border border-forest-line bg-white p-4 sm:p-5">
      <div className="mb-2.5">
        <span className="inline-block rounded-full bg-forest-soft px-2.5 py-1 text-[11px] font-bold text-forest">
          {draft.category}
        </span>
      </div>
      <h1 className="font-display mb-2.5 text-[26px] leading-tight font-semibold text-forest">{draft.title}</h1>
      <p className="mb-2 text-[16px] leading-relaxed text-[#3d3428]">{draft.lede}</p>
      <p className="mb-4 text-xs text-[#6b5f4d]">
        <b>Google snippet:</b> {draft.description}
      </p>

      {draft.image ? (
        <div className="mb-4">
          <img src={draft.image} alt="" className="block w-full rounded-xl" loading="lazy" />
          <div className="mt-1.5 text-[11px] text-[#6b5f4d]">
            Hero image — replace any time with a new URL in Edit mode.
          </div>
        </div>
      ) : null}

      <div className={`mb-4 rounded-r-xl border-l-4 p-3 ${hasTodo ? 'border-ember-dark bg-ember-soft/40' : 'border-forest bg-forest-soft/50'}`}>
        <div className="mb-1 text-[11px] font-extrabold tracking-wide text-[#6b5f4d] uppercase">
          Personal note — Emily Carter's voice{' '}
          {hasTodo && <span className="text-ember-dark">— replace the placeholder before approving</span>}
        </div>
        <div className={`text-sm ${hasTodo ? 'text-ember-dark' : 'text-[#3d3428] italic'}`}>
          {draft.personal_note || <span className="text-ember-dark not-italic">(empty)</span>}
        </div>
      </div>

      {sections.map((s, i) => (
        <div key={i} className="mb-4">
          <h2 className="font-display mb-2 text-[19px] font-semibold text-forest">{s.h2}</h2>
          {(s.paragraphs || []).map((p, j) => (
            <p key={j} className="mb-2.5 text-[15px] leading-relaxed text-[#3d3428]">{p}</p>
          ))}
        </div>
      ))}

      {faqs.length > 0 && (
        <div className="mt-5">
          <h2 className="font-display mb-2 text-[19px] font-semibold text-forest">FAQs</h2>
          {faqs.map((f, i) => (
            <details key={i} className="border-b border-cream-dark py-2.5">
              <summary className="cursor-pointer text-sm font-bold text-[#1c2b23]">{f.q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-[#3d3428]">{f.a}</p>
            </details>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-[#6b5f4d]">
        <b>Allergen claims:</b> {(draft.allergen_claims || []).join(', ') || 'none declared'}
      </div>

      {(draft.pin_variants || []).length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-[11px] font-extrabold tracking-wide text-[#6b5f4d] uppercase">
            Pinterest variants ({draft.pin_variants.length}) — copy & pin manually
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {draft.pin_variants.map((v, i) => (
              <PinVariantCard key={i} variant={v} index={i} />
            ))}
          </div>
        </div>
      )}

      <RegenerateGroup regen={regen} setMsg={setMsg} />
    </div>
  )
}

/* ------------------------- structured editor ------------------------- */

function SectionsEditor({ sections, setSections }) {
  const update = (i, patch) => setSections(sections.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  return (
    <div>
      <div className={labelCls}>Sections</div>
      {sections.map((s, i) => (
        <div key={i} className="mb-2.5 rounded-xl border border-forest-line bg-white p-3">
          <input
            className={`${inputCls} mb-2 font-bold`}
            value={s.h2}
            placeholder="Section heading"
            onChange={(e) => update(i, { h2: e.target.value })}
          />
          <textarea
            className={`${inputCls} mb-2 min-h-28`}
            value={(s.paragraphs || []).join('\n\n')}
            placeholder="Paragraphs — separate with a blank line"
            onChange={(e) => update(i, { paragraphs: e.target.value.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean) })}
          />
          <button
            className="min-h-11 px-1 text-[13px] font-bold text-ember-dark"
            onClick={() => setSections(sections.filter((_, j) => j !== i))}
          >
            ✕ Remove section
          </button>
        </div>
      ))}
      <button
        className="mb-3 min-h-11 w-full rounded-xl border border-dashed border-forest px-4 py-2.5 text-sm font-bold text-forest"
        onClick={() => setSections([...sections, { h2: '', paragraphs: [] }])}
      >
        + Add section
      </button>
    </div>
  )
}

function FaqsEditor({ faqs, setFaqs }) {
  const update = (i, patch) => setFaqs(faqs.map((f, j) => (j === i ? { ...f, ...patch } : f)))
  return (
    <div>
      <div className={labelCls}>FAQs</div>
      {faqs.map((f, i) => (
        <div key={i} className="mb-2.5 rounded-xl border border-forest-line bg-white p-3">
          <input className={`${inputCls} mb-2 font-bold`} value={f.q} placeholder="Question"
            onChange={(e) => update(i, { q: e.target.value })} />
          <textarea className={`${inputCls} mb-2 min-h-20`} value={f.a} placeholder="Answer"
            onChange={(e) => update(i, { a: e.target.value })} />
          <button
            className="min-h-11 px-1 text-[13px] font-bold text-ember-dark"
            onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}
          >
            ✕ Remove FAQ
          </button>
        </div>
      ))}
      <button
        className="mb-3 min-h-11 w-full rounded-xl border border-dashed border-forest px-4 py-2.5 text-sm font-bold text-forest"
        onClick={() => setFaqs([...faqs, { q: '', a: '' }])}
      >
        + Add FAQ
      </button>
    </div>
  )
}

/* ------------------------- pin variants editor ------------------------- */

function PinVariantsEditor({ variants, setVariants }) {
  const update = (i, patch) => setVariants(variants.map((v, j) => (j === i ? { ...v, ...patch } : v)))
  return (
    <div>
      <div className={labelCls}>Pinterest variants — edit each pin's title & description</div>
      {variants.map((v, i) => (
        <div key={i} className="mb-2.5 rounded-xl border border-forest-line bg-white p-3">
          <div className="mb-1 text-[11px] font-extrabold tracking-wide text-[#6b5f4d] uppercase">
            Pin {i + 1}
          </div>
          <input className={`${inputCls} mb-2 font-bold`} value={v.title || ''} placeholder="Pin title (≤ 100 chars)"
            maxLength={100} onChange={(e) => update(i, { title: e.target.value })} />
          <textarea className={`${inputCls} mb-2 min-h-20`} value={v.description || ''} placeholder="Pin description (≤ 450 chars)"
            maxLength={450} onChange={(e) => update(i, { description: e.target.value })} />
          <button
            className="min-h-11 px-1 text-[13px] font-bold text-ember-dark"
            onClick={() => setVariants(variants.filter((_, j) => j !== i))}
          >
            ✕ Remove variant
          </button>
        </div>
      ))}
      <button
        className="mb-3 min-h-11 w-full rounded-xl border border-dashed border-forest px-4 py-2.5 text-sm font-bold text-forest"
        onClick={() => setVariants([...variants, { title: '', description: '' }])}
      >
        + Add pin variant
      </button>
    </div>
  )
}

/* ------------------------- queue card ------------------------- */

function QueueCard({ draft, open, onToggle }) {
  const fc = (draft.flagged_claims || []).length
  const needsNote = (draft.personal_note || '').includes(TODO_MARK)
  return (
    <Card className="!p-3.5 mb-3">
      <div className="flex items-center gap-3">
        {draft.image ? (
          <img src={draft.image} alt="" loading="lazy"
            className="h-16 w-16 flex-none rounded-xl object-cover" />
        ) : (
          <div className="font-display flex h-16 w-16 flex-none items-center justify-center rounded-xl bg-forest-soft text-xl font-bold text-forest">
            {(draft.title || 'R')[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold text-[#1c2b23]">{draft.title || '(untitled)'}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-block rounded-full bg-forest-soft px-2 py-0.5 text-[10px] font-bold text-forest">
              {draft.category}
            </span>
            {fc > 0 && (
              <span className="inline-block rounded-full bg-ember-soft px-2 py-0.5 text-[10px] font-bold text-ember-dark">
                {fc} number{fc === 1 ? '' : 's'} to verify
              </span>
            )}
            {needsNote && (
              <span className="inline-block rounded-full bg-ember-dark px-2 py-0.5 text-[10px] font-bold text-white">
                note needed
              </span>
            )}
            {!draft.image && (
              <span className="inline-block rounded-full bg-ember-soft px-2 py-0.5 text-[10px] font-bold text-ember-dark">
                no image
              </span>
            )}
            <span className="text-[11px] text-[#6b5f4d]">{ago(draft.created_at)}</span>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`min-h-11 flex-none rounded-xl px-5 text-[15px] font-bold text-white active:scale-[0.98] ${open ? 'bg-[#6b5f4d]' : 'bg-forest'}`}
        >
          {open ? 'Close' : 'Review'}
        </button>
      </div>
    </Card>
  )
}

/* ------------------------- main console ------------------------- */

export default function ReviewConsole({ focusId, onFocusHandled, regen }) {
  const { user, loading: authLoading, configured, signInWithGoogle } = useAuth()
  const [admin, setAdmin] = useState(null)
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)
  const [mode, setMode] = useState('preview') // preview | edit
  const [form, setForm] = useState(null)
  const [claimChecks, setClaimChecks] = useState({})
  const [showJson, setShowJson] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setMsg('')
    try {
      const sb = await getSupabase()
      const { data, error } = await sb
        .from('drafts')
        .select('*')
        .eq('status', 'pending_review')
        .order('created_at', { ascending: true })
      if (error) throw error
      setDrafts(data || [])
    } catch (e) {
      setMsg(`Load failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!configured || !user?.email) {
      setAdmin(false)
      setLoading(false)
      return
    }
    getSupabase().then(async (sb) => {
      const { data, error } = await sb
        .from('pipeline_admins')
        .select('email')
        .eq('email', user.email)
        .maybeSingle()
      if (error) {
        setMsg(`Admin check failed: ${error.message}`)
        setAdmin(false)
      } else {
        setAdmin(!!data)
      }
      setLoading(false)
    })
  }, [authLoading, configured, user])

  useEffect(() => {
    if (admin) load()
  }, [admin, load])

  const openDraft = useCallback((d) => {
    setOpenId(d.id)
    setMode('preview')
    setClaimChecks({})
    setShowJson(false)
    const body = d.body || {}
    setForm({
      title: d.title || '',
      description: d.description || '',
      lede: d.lede || '',
      category: d.category || 'Meal Prep',
      image: d.image || '',
      personal_note: d.personal_note || '',
      sections: (body.sections || []).map((s) => ({ h2: s.h2 || '', paragraphs: s.paragraphs || [] })),
      faqs: (body.faqs || []).map((f) => ({ q: f.q || '', a: f.a || '' })),
      pin_variants: (d.pin_variants || []).map((v) => ({ title: v.title || '', description: v.description || '' })),
    })
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Deep-link: dashboard Content tab can ask us to open a specific draft.
  useEffect(() => {
    if (focusId && drafts.length > 0) {
      const d = drafts.find((x) => x.id === focusId)
      if (d) openDraft(d)
      if (onFocusHandled) onFocusHandled()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, drafts])

  const current = useMemo(() => drafts.find((d) => d.id === openId), [drafts, openId])

  // ---- approval checklist (client-side; server re-checks) ----
  const flagged = current?.flagged_claims || []
  const claimsOk = flagged.every((_, i) => claimChecks[i])
  const noteText = (form?.personal_note || '').trim()
  const noteOk = noteText.length > 0 && !noteText.includes(TODO_MARK)
  const imageOk = (form?.image || '').trim().length > 0
  const blockers = []
  if (flagged.length > 0 && !claimsOk) blockers.push(`${flagged.length - Object.values(claimChecks).filter(Boolean).length} numeric claim(s) not verified yet`)
  if (!noteOk) blockers.push(noteText.includes(TODO_MARK) ? 'personal note is still the placeholder — write your own note' : 'personal note is empty')
  if (!imageOk) blockers.push('hero image path not set (pins need it)')

  const regenTodo = useCallback(() => {
    setMsg("Single-piece regeneration isn't wired yet — the generator runs in your terminal and rebuilds the whole draft. Ask Neo to wire it.")
  }, [])
  const regenHandlers = {
    onNote: regen?.onNote || regenTodo,
    onImage: regen?.onImage || regenTodo,
    onPins: regen?.onPins || regenTodo,
  }

  async function act(kind) {
    if (!current || !form || busy) return
    setBusy(true)
    setMsg('')
    try {
      const sb = await getSupabase()
      const edited = {
        title: form.title.trim(),
        description: form.description.trim(),
        lede: form.lede.trim(),
        category: form.category,
        image: form.image.trim(),
        personal_note: form.personal_note,
        pin_variants: form.pin_variants,
        body: { sections: form.sections, faqs: form.faqs },
      }
      if (!edited.title) throw new Error('Title cannot be empty')
      if (kind === 'approve') {
        if (blockers.length > 0) throw new Error('Cannot approve yet: ' + blockers.join('; '))
      }
      const before = {
        title: current.title, description: current.description, lede: current.lede,
        category: current.category, image: current.image, personal_note: current.personal_note,
        pin_variants: current.pin_variants,
        body: current.body,
      }
      const diff = diffObjects(before, edited)
      const patch = { ...edited }
      if (kind === 'approve') {
        patch.status = 'approved'
        patch.reviewer_id = user.id
        patch.reviewed_at = new Date().toISOString()
      } else if (kind === 'reject') {
        patch.status = 'rejected'
        patch.reviewer_id = user.id
        patch.reviewed_at = new Date().toISOString()
      }
      const { error: upErr } = await sb.from('drafts').update(patch).eq('id', current.id)
      if (upErr) throw upErr
      if (Object.keys(diff).length > 0) {
        const { error: revErr } = await sb.from('draft_revisions').insert({
          draft_id: current.id,
          edited_by: user.id,
          diff,
        })
        if (revErr) throw revErr
      }
      setMsg(
        kind === 'approve'
          ? '✓ Approved — the publisher will pick it up on the next run.'
          : kind === 'reject'
            ? 'Rejected.'
            : 'Edits saved (still pending review).'
      )
      setOpenId(null)
      setForm(null)
      await load()
    } catch (e) {
      setMsg(`Error: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  if (authLoading || loading) return <div className="p-10 text-[#6b5f4d]">Loading review console…</div>

  if (!configured || !user) {
    return (
      <div className="max-w-xl p-10">
        <h1 className="font-display text-2xl font-semibold text-forest">Review Console</h1>
        <p className="mt-2">Sign in with the owner Google account to review drafts.</p>
        <div className="mt-4"><PrimaryBtn onClick={signInWithGoogle}>Sign in with Google</PrimaryBtn></div>
      </div>
    )
  }

  if (!admin) {
    return (
      <div className="max-w-xl p-10">
        <h1 className="font-display text-2xl font-semibold text-forest">Review Console</h1>
        <p className="mt-2">This account ({user.email}) is not a pipeline admin.</p>
      </div>
    )
  }

  return (
    <div>
      <Seo title="Review Console — internal" description="Internal content review console." noindex />
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-display m-0 text-[22px] font-semibold text-forest">Review queue</h1>
        <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${drafts.length > 0 ? 'bg-ember-dark text-white' : 'bg-forest-soft text-forest'}`}>
          {drafts.length} waiting
        </span>
      </div>
      <p className="mt-1 mb-4 text-sm text-[#6b5f4d]">
        Nothing publishes without your approval. Open a draft, read the preview, check the numbers, then approve or reject.
      </p>
      {msg && (
        <div className={`mb-4 rounded-xl px-3.5 py-2.5 text-sm ${msg.startsWith('Error') ? 'bg-ember-soft text-ember-dark' : 'bg-forest-soft text-forest'}`}>
          {msg}
        </div>
      )}

      {drafts.map((d) => {
        const open = openId === d.id
        return (
          <div key={d.id}>
            <QueueCard draft={d} open={open}
              onToggle={() => (open ? (setOpenId(null), setForm(null)) : openDraft(d))} />

            {open && current && form && (
              <div className="mb-6 rounded-2xl border border-forest-line bg-cream p-3 sm:p-4">
                <div className="mb-4 flex gap-2">
                  {['preview', 'edit'].map((m) => (
                    <button key={m}
                      onClick={() => setMode(m)}
                      className={`min-h-11 rounded-xl border px-5 text-sm font-bold active:scale-[0.98] ${
                        mode === m ? 'border-forest bg-forest text-white' : 'border-forest-line bg-cream-card text-forest'
                      }`}>
                      {m === 'preview' ? '👁 Preview' : '✏ Edit'}
                    </button>
                  ))}
                </div>

                {mode === 'preview' ? (
                  <Preview
                    draft={{ ...current, ...form, body: { sections: form.sections, faqs: form.faqs } }}
                    regen={regenHandlers}
                    setMsg={setMsg}
                  />
                ) : (
                  <div className="rounded-2xl border border-forest-line bg-white p-4">
                    <div className={labelCls}>Title</div>
                    <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    <div className={labelCls}>Meta description (Google snippet)</div>
                    <input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    <div className={labelCls}>Lede</div>
                    <textarea className={`${inputCls} min-h-16`} value={form.lede} onChange={(e) => setForm({ ...form, lede: e.target.value })} />
                    <div className="flex flex-wrap gap-3">
                      <div className="min-w-40 flex-1">
                        <div className={labelCls}>Category</div>
                        <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="min-w-52 flex-[2]">
                        <div className={labelCls}>Hero image URL</div>
                        <input className={inputCls} value={form.image} placeholder="https://…"
                          onChange={(e) => setForm({ ...form, image: e.target.value })} />
                      </div>
                    </div>
                    <div className={labelCls}>
                      Personal note {(form.personal_note || '').includes(TODO_MARK) && <span className="text-ember-dark">— replace the placeholder with your own words</span>}
                    </div>
                    <textarea className={`${inputCls} min-h-20`} value={form.personal_note}
                      onChange={(e) => setForm({ ...form, personal_note: e.target.value })} />
                    <SectionsEditor sections={form.sections} setSections={(s) => setForm({ ...form, sections: s })} />
                    <FaqsEditor faqs={form.faqs} setFaqs={(f) => setForm({ ...form, faqs: f })} />
                    <PinVariantsEditor variants={form.pin_variants} setVariants={(v) => setForm({ ...form, pin_variants: v })} />
                    <button
                      onClick={() => setShowJson(!showJson)}
                      className="min-h-11 py-2 text-[13px] text-[#6b5f4d] underline"
                    >
                      {showJson ? 'Hide raw JSON' : 'Advanced: show raw body JSON'}
                    </button>
                    {showJson && (
                      <pre className="max-h-72 overflow-auto rounded-xl bg-forest-deep p-3 text-[11px] text-cream">
                        {JSON.stringify({ sections: form.sections, faqs: form.faqs }, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                {/* approval checklist */}
                <div className="mt-3 rounded-2xl border border-forest-line bg-white p-4">
                  <div className="mb-2.5 text-[13px] font-extrabold tracking-wide text-[#6b5f4d] uppercase">
                    Before you approve
                  </div>
                  {flagged.length > 0 ? (
                    <div className="mb-2.5">
                      {flagged.map((f, i) => (
                        <label key={i} className="mb-2 flex cursor-pointer items-start gap-2.5 text-[13px]">
                          <input type="checkbox" checked={!!claimChecks[i]}
                            className="mt-0.5 h-6 w-6 flex-none accent-[#1e4633]"
                            onChange={(e) => setClaimChecks({ ...claimChecks, [i]: e.target.checked })} />
                          <span><b>{f.claim}</b> <span className="text-[#6b5f4d]">…{(f.context || '').slice(0, 110)}…</span></span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-2.5 text-[13px] text-[#6b5f4d]">No numeric claims flagged in this draft.</div>
                  )}
                  <div className="mb-1.5 text-[13px]">
                    {noteOk ? '✅' : '⬜'} Personal note
                    {!noteOk && <span className="text-ember-dark"> — {noteText.includes(TODO_MARK) ? 'still the placeholder' : 'empty'}</span>}
                  </div>
                  <div className="text-[13px]">
                    {imageOk ? '✅' : '⬜'} Hero image set
                    {!imageOk && <span className="text-ember-dark"> — required for pins</span>}
                  </div>
                </div>

                {/* spacer so the fixed action bar never covers content */}
                <div className="h-28" />

                {/* sticky bottom action bar — thumb-friendly on the phone */}
                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-forest-line bg-cream-card/95 backdrop-blur">
                  <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-3">
                    <PrimaryBtn
                      className="flex-1 !px-3"
                      disabled={busy || blockers.length > 0}
                      onClick={() => act('approve')}
                    >
                      ✓ Approve{blockers.length > 0 ? ` (${blockers.length})` : ''}
                    </PrimaryBtn>
                    <GhostBtn className="flex-1 !px-3" disabled={busy} onClick={() => act('edit')}>
                      Save edits
                    </GhostBtn>
                    <DangerBtn className="flex-1 !px-3" disabled={busy} onClick={() => act('reject')}>
                      Reject
                    </DangerBtn>
                  </div>
                  {blockers.length > 0 && (
                    <div className="mx-auto max-w-3xl px-4 pb-2.5 text-xs text-ember-dark">
                      Fix to enable approval: {blockers.join('; ')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {drafts.length === 0 && (
        <EmptyState
          icon="🎉"
          title="Queue is empty"
          text="Nothing waiting for you. When the generator writes new drafts, they'll land here for your approve / reject."
          actionLabel="⛏ Copy: run the miner"
          actionDoneLabel="✓ Copied!"
          onAction={() => navigator.clipboard.writeText('node pipeline/scripts/keyword-miner.mjs')}
        />
      )}
    </div>
  )
}
