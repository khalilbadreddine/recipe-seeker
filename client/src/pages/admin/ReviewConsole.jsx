import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'
import Seo from '../../components/Seo'

/**
 * Review Console — THE human gate of the content pipeline.
 * Route: /admin/review (internal only). Also embedded in /admin/dashboard.
 *
 * Only emails listed in the `pipeline_admins` table may use it.
 * Actions: approve / edit / reject on drafts with status='pending_review'.
 * Every edit writes a {before, after} diff to `draft_revisions` — the audit
 * trail of LLM output vs. what actually shipped.
 *
 * Approval checklist (client-side, server re-checks):
 *   - every flagged numeric claim ticked as verified
 *   - personal note present and real (AI-written in the brand character's
 *     voice; the TODO_KHALIL placeholder still blocks)
 *   - hero image set (auto-generated at draft time; replaceable)
 */

const CATEGORIES = ['Iron', 'Protein', 'Calcium', 'Vitamin C', 'Zinc', 'Fiber', 'Meal Prep', 'Breakfast']
const GREEN = '#1e4633'
const CREAM = '#fffdf8'
const TOMATO = '#E4572E'
const BORDER = '#e3d9c8'
const MUTED = '#6b5f4d'
const SERIF = 'Georgia, "Times New Roman", serif'
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

function ago(iso) {
  if (!iso) return '—'
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const input = {
  width: '100%', padding: '10px 12px', margin: '4px 0 12px', border: '1px solid #d8cfc2',
  borderRadius: 8, fontSize: 15, fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box',
}
const label = { fontSize: 11, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 4 }
const btn = (bg, disabled) => ({
  padding: '12px 20px', borderRadius: 8, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
  background: disabled ? '#c9bfae' : bg, color: '#fff', fontWeight: 700, fontSize: 15,
  marginRight: 8, marginBottom: 8, minHeight: 48, opacity: disabled ? 0.7 : 1,
})
const pill = (bg, fg) => ({
  display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 10px',
  borderRadius: 12, background: bg, color: fg, whiteSpace: 'nowrap',
})

/* ------------------------- rendered preview ------------------------- */

export function Preview({ draft }) {
  const body = draft.body || {}
  const sections = body.sections || []
  const faqs = body.faqs || []
  const hasTodo = (draft.personal_note || '').includes(TODO_MARK)
  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ marginBottom: 10 }}>
        <span style={pill('#e3efe7', GREEN)}>{draft.category}</span>
      </div>
      <h1 style={{ fontFamily: SERIF, fontSize: 26, margin: '0 0 10px', color: GREEN, lineHeight: 1.25 }}>{draft.title}</h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: '#3d3428', margin: '0 0 8px' }}>{draft.lede}</p>
      <p style={{ fontSize: 12, color: MUTED, margin: '0 0 16px' }}>
        <b>Google snippet:</b> {draft.description}
      </p>

      {draft.image ? (
        <div style={{ marginBottom: 18 }}>
          <img src={draft.image} alt="" style={{ width: '100%', borderRadius: 10, display: 'block' }} />
          <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>Hero image (auto-generated — replace any time via the field below)</div>
        </div>
      ) : null}

      <div style={{
        borderLeft: `4px solid ${hasTodo ? TOMATO : GREEN}`, background: hasTodo ? '#fff7f3' : '#f4f8f4',
        padding: '12px 14px', borderRadius: '0 8px 8px 0', marginBottom: 18,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
          Personal note {hasTodo && <span style={{ color: TOMATO }}>— write yours before approving</span>}
        </div>
        <div style={{ fontSize: 14, fontStyle: hasTodo ? 'normal' : 'italic', color: hasTodo ? TOMATO : '#3d3428' }}>
          {draft.personal_note || <span style={{ color: TOMATO }}>(empty)</span>}
        </div>
      </div>

      {sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <h2 style={{ fontFamily: SERIF, fontSize: 19, color: GREEN, margin: '0 0 8px' }}>{s.h2}</h2>
          {(s.paragraphs || []).map((p, j) => (
            <p key={j} style={{ fontSize: 15, lineHeight: 1.7, color: '#3d3428', margin: '0 0 10px' }}>{p}</p>
          ))}
        </div>
      ))}

      {faqs.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontFamily: SERIF, fontSize: 19, color: GREEN, margin: '0 0 8px' }}>FAQs</h2>
          {faqs.map((f, i) => (
            <details key={i} style={{ borderBottom: '1px solid #efe7d6', padding: '10px 0' }}>
              <summary style={{ fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{f.q}</summary>
              <p style={{ fontSize: 14, color: '#3d3428', margin: '8px 0 0', lineHeight: 1.6 }}>{f.a}</p>
            </details>
          ))}
        </div>
      )}

      <div style={{ marginTop: 18, fontSize: 12, color: MUTED }}>
        <b>Allergen claims:</b> {(draft.allergen_claims || []).join(', ') || 'none declared'}
      </div>

      {(draft.pin_variants || []).length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
            Pinterest variants ({draft.pin_variants.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {draft.pin_variants.map((v, i) => (
              <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, background: CREAM }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{v.title}</div>
                <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{v.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------- structured editor ------------------------- */

function SectionsEditor({ sections, setSections }) {
  const update = (i, patch) => setSections(sections.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  return (
    <div>
      <div style={label}>Sections</div>
      {sections.map((s, i) => (
        <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, marginBottom: 10, background: '#fff' }}>
          <input
            style={{ ...input, fontWeight: 700, marginBottom: 8 }}
            value={s.h2}
            placeholder="Section heading"
            onChange={(e) => update(i, { h2: e.target.value })}
          />
          <textarea
            style={{ ...input, minHeight: 110, marginBottom: 8 }}
            value={(s.paragraphs || []).join('\n\n')}
            placeholder="Paragraphs — separate with a blank line"
            onChange={(e) => update(i, { paragraphs: e.target.value.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean) })}
          />
          <button
            style={{ background: 'none', border: 'none', color: TOMATO, fontWeight: 700, cursor: 'pointer', fontSize: 13, padding: 4 }}
            onClick={() => setSections(sections.filter((_, j) => j !== i))}
          >
            ✕ Remove section
          </button>
        </div>
      ))}
      <button
        style={{ background: 'none', border: `1px dashed ${GREEN}`, color: GREEN, fontWeight: 700, borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 14, width: '100%', marginBottom: 12 }}
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
      <div style={label}>FAQs</div>
      {faqs.map((f, i) => (
        <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, marginBottom: 10, background: '#fff' }}>
          <input style={{ ...input, fontWeight: 700, marginBottom: 8 }} value={f.q} placeholder="Question"
            onChange={(e) => update(i, { q: e.target.value })} />
          <textarea style={{ ...input, minHeight: 70, marginBottom: 8 }} value={f.a} placeholder="Answer"
            onChange={(e) => update(i, { a: e.target.value })} />
          <button
            style={{ background: 'none', border: 'none', color: TOMATO, fontWeight: 700, cursor: 'pointer', fontSize: 13, padding: 4 }}
            onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}
          >
            ✕ Remove FAQ
          </button>
        </div>
      ))}
      <button
        style={{ background: 'none', border: `1px dashed ${GREEN}`, color: GREEN, fontWeight: 700, borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 14, width: '100%', marginBottom: 12 }}
        onClick={() => setFaqs([...faqs, { q: '', a: '' }])}
      >
        + Add FAQ
      </button>
    </div>
  )
}

/* ------------------------- main console ------------------------- */

export default function ReviewConsole() {
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

  const openDraft = (d) => {
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
    })
  }

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
        body: { sections: form.sections, faqs: form.faqs },
      }
      if (!edited.title) throw new Error('Title cannot be empty')
      if (kind === 'approve') {
        if (blockers.length > 0) throw new Error('Cannot approve yet: ' + blockers.join('; '))
      }
      const before = {
        title: current.title, description: current.description, lede: current.lede,
        category: current.category, image: current.image, personal_note: current.personal_note,
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
          ? 'Approved — the publisher will pick it up on the next run.'
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

  if (authLoading || loading) return <div style={{ padding: 40 }}>Loading review console…</div>

  if (!configured || !user) {
    return (
      <div style={{ padding: 40, maxWidth: 560 }}>
        <h1 style={{ fontFamily: SERIF }}>Review Console</h1>
        <p>Sign in with the owner Google account to review drafts.</p>
        <button style={btn('#1a7a3c')} onClick={signInWithGoogle}>Sign in with Google</button>
      </div>
    )
  }

  if (!admin) {
    return (
      <div style={{ padding: 40, maxWidth: 560 }}>
        <h1 style={{ fontFamily: SERIF }}>Review Console</h1>
        <p>This account ({user.email}) is not a pipeline admin.</p>
      </div>
    )
  }

  return (
    <div>
      <Seo title="Review Console — internal" description="Internal content review console." noindex />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: SERIF, margin: '0 0 4px', fontSize: 22 }}>Review queue</h1>
        <span style={pill(blockers.length > 0 && openId ? '#fbe9e1' : '#e3efe7', blockers.length > 0 && openId ? '#c24a24' : GREEN)}>
          {drafts.length} waiting
        </span>
      </div>
      <p style={{ color: MUTED, marginTop: 0, fontSize: 14 }}>
        Nothing publishes without your approval. Open a draft, read the preview, check the numbers, write your note.
      </p>
      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: msg.startsWith('Error') ? '#fdecea' : '#e9f7ef', fontSize: 14 }}>
          {msg}
        </div>
      )}

      {drafts.map((d) => {
        const open = openId === d.id
        const fc = (d.flagged_claims || []).length
        return (
          <div key={d.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 12, background: CREAM }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{d.title}</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={pill('#e3efe7', GREEN)}>{d.category}</span>
                  {fc > 0 && <span style={pill('#fff3d6', '#8a6d1b')}>{fc} number{fc === 1 ? '' : 's'} to verify</span>}
                  {(d.personal_note || '').includes(TODO_MARK) && <span style={pill('#fbe9e1', '#c24a24')}>note needed</span>}
                  <span>{ago(d.created_at)}</span>
                </div>
              </div>
              <button style={{ ...btn(open ? '#6b5f4d' : GREEN), margin: 0, minHeight: 44, flex: 'none' }}
                onClick={() => (open ? (setOpenId(null), setForm(null)) : openDraft(d))}>
                {open ? 'Close' : 'Review'}
              </button>
            </div>

            {open && current && form && (
              <div style={{ marginTop: 16, borderTop: `1px dashed ${BORDER}`, paddingTop: 16 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {['preview', 'edit'].map((m) => (
                    <button key={m}
                      onClick={() => setMode(m)}
                      style={{
                        padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                        background: mode === m ? GREEN : '#fff', color: mode === m ? '#fff' : GREEN,
                        border: `1px solid ${GREEN}`, minHeight: 44,
                      }}>
                      {m === 'preview' ? '👁 Preview' : '✏ Edit'}
                    </button>
                  ))}
                </div>

                {mode === 'preview' ? (
                  <Preview draft={{ ...current, ...form, body: { sections: form.sections, faqs: form.faqs } }} />
                ) : (
                  <div>
                    <div style={label}>Title</div>
                    <input style={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    <div style={label}>Meta description (Google snippet)</div>
                    <input style={input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    <div style={label}>Lede</div>
                    <textarea style={{ ...input, minHeight: 60 }} value={form.lede} onChange={(e) => setForm({ ...form, lede: e.target.value })} />
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 160px' }}>
                        <div style={label}>Category</div>
                        <select style={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: '2 1 220px' }}>
                        <div style={label}>Hero image path</div>
                        <input style={input} value={form.image} placeholder="/images/my-post.webp"
                          onChange={(e) => setForm({ ...form, image: e.target.value })} />
                      </div>
                    </div>
                    <div style={label}>Personal note {(form.personal_note || '').includes(TODO_MARK) && <span style={{ color: TOMATO }}>— replace the placeholder with your own words</span>}</div>
                    <textarea style={{ ...input, minHeight: 80 }} value={form.personal_note}
                      onChange={(e) => setForm({ ...form, personal_note: e.target.value })} />
                    <SectionsEditor sections={form.sections} setSections={(s) => setForm({ ...form, sections: s })} />
                    <FaqsEditor faqs={form.faqs} setFaqs={(f) => setForm({ ...form, faqs: f })} />
                    <button
                      onClick={() => setShowJson(!showJson)}
                      style={{ background: 'none', border: 'none', color: MUTED, fontSize: 13, cursor: 'pointer', padding: '8px 0', textDecoration: 'underline' }}
                    >
                      {showJson ? 'Hide raw JSON' : 'Advanced: show raw body JSON'}
                    </button>
                    {showJson && (
                      <pre style={{ background: '#2b2b2b', color: '#d6d6d6', padding: 12, borderRadius: 8, fontSize: 11, overflowX: 'auto', maxHeight: 300, overflowY: 'auto' }}>
                        {JSON.stringify({ sections: form.sections, faqs: form.faqs }, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                {/* approval checklist */}
                <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, margin: '8px 0 4px', background: '#fff' }}>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: MUTED }}>
                    Before you approve
                  </div>
                  {flagged.length > 0 ? (
                    <div style={{ marginBottom: 10 }}>
                      {flagged.map((f, i) => (
                        <label key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, marginBottom: 8, cursor: 'pointer' }}>
                          <input type="checkbox" checked={!!claimChecks[i]} style={{ width: 20, height: 20, marginTop: 2, flex: 'none' }}
                            onChange={(e) => setClaimChecks({ ...claimChecks, [i]: e.target.checked })} />
                          <span><b>{f.claim}</b> <span style={{ color: MUTED }}>…{(f.context || '').slice(0, 110)}…</span></span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>No numeric claims flagged in this draft.</div>
                  )}
                  <div style={{ fontSize: 13, marginBottom: 6 }}>
                    {noteOk ? '✅' : '⬜'} Personal note written by you
                    {!noteOk && <span style={{ color: TOMATO }}> — {noteText.includes(TODO_MARK) ? 'still the placeholder' : 'empty'}</span>}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    {imageOk ? '✅' : '⬜'} Hero image path set
                    {!imageOk && <span style={{ color: TOMATO }}> — required for pins</span>}
                  </div>
                </div>

                <div style={{ position: 'sticky', bottom: 0, background: CREAM, padding: '12px 0 4px', borderTop: `1px solid ${BORDER}`, marginTop: 12 }}>
                  <button style={btn(GREEN, busy || blockers.length > 0)} disabled={busy || blockers.length > 0} onClick={() => act('approve')}>
                    Approve{blockers.length > 0 ? ` (${blockers.length} to fix)` : ''}
                  </button>
                  <button style={btn('#8a6d3b', busy)} disabled={busy} onClick={() => act('edit')}>Save edits</button>
                  <button style={btn('#b03a2e', busy)} disabled={busy} onClick={() => act('reject')}>Reject</button>
                  {blockers.length > 0 && (
                    <div style={{ fontSize: 12, color: TOMATO, marginTop: 4 }}>Fix above to enable approval: {blockers.join('; ')}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {drafts.length === 0 && <p style={{ color: MUTED }}>Queue is empty. Run the keyword miner + draft generator to fill it.</p>}
    </div>
  )
}
