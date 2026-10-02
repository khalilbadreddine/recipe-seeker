import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getSupabase } from '../lib/supabase'

/** Public average only appears once a recipe has this many real ratings. */
export const MIN_PUBLIC_RATINGS = 3

const LABELS = ['', 'Not for me', 'It was OK', 'Good', 'Really good', 'Loved it!']

function Star({ active, className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} ${active ? 'text-ink' : 'text-ink/15'}`} fill="currentColor" aria-hidden="true">
      <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.45l-5.8 3.05 1.1-6.47L2.6 9.45l6.5-.95L12 2.6z" />
    </svg>
  )
}

/**
 * Real ratings: one 1–5 rating per signed-in user per recipe, stored in
 * Supabase (recipe_ratings, see supabase/site-features.sql). The public sees
 * only the count and average (recipe_rating_stats view), shown once there are
 * MIN_PUBLIC_RATINGS. Renders nothing when Supabase isn't configured.
 * `initialStats` comes from the build so the prerendered page shows the same
 * numbers its structured data reports.
 */
export default function RatingWidget({ slug, title, initialStats = null }) {
  const { configured, user, loading: authLoading, signInWithGoogle } = useAuth()
  const [stats, setStats] = useState(initialStats)
  const [mine, setMine] = useState(0)
  const [hover, setHover] = useState(0)
  const [status, setStatus] = useState('idle') // idle | saving | saved | error | unavailable

  const loadStats = useCallback(async () => {
    const client = await getSupabase()
    if (!client) return
    const { data, error } = await client
      .from('recipe_rating_stats')
      .select('rating_avg, rating_count')
      .eq('recipe_slug', slug)
      .maybeSingle()
    if (error) setStatus('unavailable')
    else setStats(data || { rating_avg: null, rating_count: 0 })
  }, [slug])

  useEffect(() => {
    if (!configured) return
    setStats(initialStats)
    setMine(0)
    setStatus('idle')
    loadStats().catch(() => setStatus('unavailable'))
  }, [configured, slug, initialStats, loadStats])

  useEffect(() => {
    if (!configured || !user) return
    let alive = true
    ;(async () => {
      const client = await getSupabase()
      const { data } = await client.from('recipe_ratings').select('rating').eq('recipe_slug', slug).eq('user_id', user.id).maybeSingle()
      if (alive && data) setMine(data.rating)
    })().catch(() => {})
    return () => {
      alive = false
    }
  }, [configured, user, slug])

  if (!configured) return null

  const choose = async (value) => {
    if (!user) return signInWithGoogle()
    setMine(value)
    setStatus('saving')
    try {
      const client = await getSupabase()
      const { error } = await client
        .from('recipe_ratings')
        .upsert({ recipe_slug: slug, user_id: user.id, rating: value, updated_at: new Date().toISOString() }, { onConflict: 'recipe_slug,user_id' })
      if (error) throw error
      setStatus('saved')
      await loadStats()
    } catch {
      setStatus('error')
    }
  }

  const count = stats?.rating_count || 0
  const avg = stats?.rating_avg != null ? Number(stats.rating_avg) : null
  const showAvg = count >= MIN_PUBLIC_RATINGS && avg != null

  let note
  if (status === 'unavailable') note = 'Ratings open soon.'
  else if (status === 'saving') note = 'Saving your rating…'
  else if (status === 'saved') note = `Thanks! You rated it ${mine}/5.`
  else if (status === 'error') note = 'Couldn’t save your rating. Please try again.'
  else if (hover) note = LABELS[hover]
  else if (!user && !authLoading) note = 'Sign in with Google to rate. One rating per person.'
  else if (mine) note = `Your rating: ${mine}/5. Tap to change it.`
  else note = 'Tap a star to rate.'

  return (
    <div className="no-print rounded-3xl bg-zest-soft px-6 py-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Made it? Rate it.</h2>
        {showAvg ? (
          <p className="mt-1 flex items-center gap-2 text-sm text-ink/70">
            <Star active className="h-4 w-4" />
            <strong className="font-bold text-ink">{avg.toFixed(1)}</strong> average from {count} rating{count === 1 ? '' : 's'}
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink/65">
            {count > 0 ? 'A few early ratings so far. Add yours.' : `No ratings yet. Be the first to rate ${title ? `“${title}”` : 'it'}.`}
          </p>
        )}
      </div>
      <div className="mt-4 sm:mt-0 sm:text-right">
        <div className="flex items-center gap-1 sm:justify-end" role="radiogroup" aria-label="Rate this recipe">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mine === value}
              aria-label={`${value} star${value > 1 ? 's' : ''}`}
              disabled={status === 'unavailable' || status === 'saving'}
              onClick={() => choose(value)}
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(0)}
              onFocus={() => setHover(value)}
              onBlur={() => setHover(0)}
              className="p-1 hover:scale-110 disabled:opacity-50"
            >
              <Star active={value <= (hover || mine)} />
            </button>
          ))}
        </div>
        <p className="mt-1 min-h-5 text-sm font-medium text-ink/70" aria-live="polite">
          {note}
        </p>
      </div>
    </div>
  )
}
