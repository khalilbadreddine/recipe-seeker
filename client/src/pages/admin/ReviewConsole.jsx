import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'
import Seo from '../../components/Seo'

/**
 * Review Console — THE human gate of the content pipeline.
 * Route: /admin/review (internal only).
 *
 * Only emails listed in the `pipeline_admins` table may use it.
 * Actions: approve / edit / reject on drafts with status='pending_review'.
 * Every edit writes a {before, after} diff to `draft_revisions` — the audit
 * trail of LLM output vs. what actually shipped.
 * If a draft has flagged numeric claims, approval requires ticking the
 * "I verified the numbers" checkbox first.
 */

const CATEGORIES = ['Iron', 'Protein', 'Calcium', 'Vitamin C', 'Zinc', 'Fiber', 'Meal Prep', 'Breakfast']

function diffObjects(before, after) {
  const diff = {}
  for (const key of Object.keys(after)) {
    const b = JSON.stringify(before[key] ?? null)
    const a = JSON.stringify(after[key] ?? null)
    if (b !== a) diff[key] = { before: before[key] ?? null, after: after[key] ?? null }
  }
  return diff
}

export default function ReviewConsole() {
  const { user, loading: authLoading, configured, signInWithGoogle } = useAuth()
  const [admin, setAdmin] = useState(null) // null = unknown, true/false
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)
  const [form, setForm] = useState({})
  const [verified, setVerified] = useState(false)
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

  // admin check: is this login email in pipeline_admins?
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
    setVerified(false)
    setForm({
      title: d.title || '',
      description: d.description || '',
      lede: d.lede || '',
      category: d.category || 'Meal Prep',
      image: d.image || '',
      personal_note: d.personal_note || '',
      bodyJson: JSON.stringify(d.body || { sections: [], faqs: [] }, null, 2),
    })
  }

  const current = useMemo(() => drafts.find((d) => d.id === openId), [drafts, openId])

  async function act(kind) {
    if (!current || busy) return
    setBusy(true)
    setMsg('')
    try {
      const sb = await getSupabase()
      let body
      try {
        body = JSON.parse(form.bodyJson)
      } catch {
        throw new Error('Body JSON is invalid — fix it before saving')
      }
      const edited = {
        title: form.title.trim(),
        description: form.description.trim(),
        lede: form.lede.trim(),
        category: form.category,
        image: form.image.trim(),
        personal_note: form.personal_note,
        body,
      }
      if (!edited.title) throw new Error('Title cannot be empty')

      if (kind === 'approve') {
        if ((current.flagged_claims || []).length > 0 && !verified) {
          throw new Error('This draft has flagged numeric claims — tick "I verified the numbers" to approve')
        }
        if (!edited.personal_note.trim()) throw new Error('personal_note is empty — the draft cannot be approved without it')
        if (!edited.image.trim()) throw new Error('image path is empty — set the hero image before approving (pins need it)')
      }

      // log the diff BEFORE writing (audit trail)
      const diff = diffObjects(current, edited)
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
          ? `Approved — the publisher will pick it up on the next run.`
          : kind === 'reject'
            ? `Rejected.`
            : `Edits saved (still pending review).`
      )
      setOpenId(null)
      await load()
    } catch (e) {
      setMsg(`Error: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  const input = {
    width: '100%', padding: '8px 10px', margin: '4px 0 10px', border: '1px solid #d8cfc2',
    borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fffdf8',
  }
  const label = { fontSize: 12, fontWeight: 700, color: '#6b5f4d', textTransform: 'uppercase', letterSpacing: '.04em' }
  const btn = (bg) => ({
    padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: bg, color: '#fff', fontWeight: 700, fontSize: 14, marginRight: 8,
  })

  if (authLoading || loading) return <div style={{ padding: 40 }}>Loading review console…</div>

  if (!configured || !user) {
    return (
      <div style={{ padding: 40, maxWidth: 560 }}>
        <h1>Review Console</h1>
        <p>Sign in with the owner Google account to review drafts.</p>
        <button style={btn('#1a7a3c')} onClick={signInWithGoogle}>Sign in with Google</button>
      </div>
    )
  }

  if (!admin) {
    return (
      <div style={{ padding: 40, maxWidth: 560 }}>
        <h1>Review Console</h1>
        <p>This account ({user.email}) is not a pipeline admin.</p>
        <p style={{ fontSize: 13, color: '#6b5f4d' }}>
          The owner must run this once in Supabase SQL Editor:<br />
          <code>insert into public.pipeline_admins (email) values ('{user.email}') on conflict do nothing;</code>
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <Seo title="Review Console — internal" description="Internal content review console." noindex />
      <h1 style={{ marginBottom: 4 }}>Review Console</h1>
      <p style={{ color: '#6b5f4d', marginTop: 0 }}>
        {drafts.length} draft{drafts.length === 1 ? '' : 's'} waiting for review. Nothing publishes without your approval.
      </p>
      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: msg.startsWith('Error') ? '#fdecea' : '#e9f7ef', fontSize: 14 }}>
          {msg}
        </div>
      )}

      {drafts.map((d) => (
        <div key={d.id} style={{ border: '1px solid #e3d9c8', borderRadius: 12, padding: 16, marginBottom: 12, background: '#fffdf8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{d.title}</div>
              <div style={{ fontSize: 12, color: '#6b5f4d' }}>
                {d.category} · {(d.flagged_claims || []).length} flagged claim{(d.flagged_claims || []).length === 1 ? '' : 's'} · {new Date(d.created_at).toLocaleString()}
              </div>
            </div>
            <button style={btn('#2f5d3a')} onClick={() => (openId === d.id ? setOpenId(null) : openDraft(d))}>
              {openId === d.id ? 'Close' : 'Review'}
            </button>
          </div>

          {openId === d.id && (
            <div style={{ marginTop: 16, borderTop: '1px dashed #e3d9c8', paddingTop: 16 }}>
              {(d.flagged_claims || []).length > 0 && (
                <div style={{ background: '#fff4e0', border: '1px solid #e8b93e', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>⚠ Verify these numeric claims before approving:</div>
                  {d.flagged_claims.map((f, i) => (
                    <div key={i} style={{ fontSize: 13, marginBottom: 6 }}>
                      <b>{f.claim}</b> — <span style={{ color: '#6b5f4d' }}>…{f.context}…</span>
                    </div>
                  ))}
                  <label style={{ display: 'block', marginTop: 10, fontSize: 14 }}>
                    <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />{' '}
                    I verified every number above against a reliable source
                  </label>
                </div>
              )}

              <div style={label}>Title</div>
              <input style={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <div style={label}>Meta description</div>
              <input style={input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div style={label}>Lede</div>
              <textarea style={{ ...input, minHeight: 56 }} value={form.lede} onChange={(e) => setForm({ ...form, lede: e.target.value })} />
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={label}>Category</div>
                  <select style={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ flex: 2 }}>
                  <div style={label}>Hero image path (e.g. /images/slug.webp)</div>
                  <input style={input} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="/images/my-post.webp" />
                </div>
              </div>
              <div style={label}>Personal note (required — the human signal)</div>
              <textarea style={{ ...input, minHeight: 64 }} value={form.personal_note} onChange={(e) => setForm({ ...form, personal_note: e.target.value })} />
              <div style={label}>Body JSON (sections + faqs)</div>
              <textarea style={{ ...input, minHeight: 220, fontFamily: 'monospace', fontSize: 12 }} value={form.bodyJson} onChange={(e) => setForm({ ...form, bodyJson: e.target.value })} />

              <div style={{ marginTop: 8 }}>
                <button style={btn('#1a7a3c')} disabled={busy} onClick={() => act('approve')}>Approve</button>
                <button style={btn('#8a6d3b')} disabled={busy} onClick={() => act('edit')}>Save edits</button>
                <button style={btn('#b03a2e')} disabled={busy} onClick={() => act('reject')}>Reject</button>
              </div>
              <div style={{ fontSize: 12, color: '#6b5f4d', marginTop: 10 }}>
                Allergen claims: {(d.allergen_claims || []).join(', ') || 'none declared'}
              </div>
            </div>
          )}
        </div>
      ))}

      {drafts.length === 0 && <p style={{ color: '#6b5f4d' }}>Queue is empty. Run the keyword miner + draft generator to fill it.</p>}
    </div>
  )
}
