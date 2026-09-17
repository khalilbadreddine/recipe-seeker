import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import Breadcrumbs from '../components/Breadcrumbs'
import Reveal from '../components/Reveal'
import ResponsiveImage from '../components/ResponsiveImage'
import PrintButton from '../components/PrintButton'
import MedicalDisclaimer from '../components/MedicalDisclaimer'
import { useAuth } from '../context/AuthContext'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { absUrl, absImage, recipes } from '../data/site'

/* ------------------------------------------------------------------ */
/* Data model                                                          */
/*                                                                     */
/* Per-serving nutrition is USDA-grounded in data/recipes.json as       */
/* nutrition.<key> = { amount, unit }. We only AGGREGATE here — never   */
/* recompute from ingredients.                                         */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'rs-day-v1'

const SLOTS = [
  { id: 'breakfast', label: 'Breakfast', capacity: 1, hint: 'Start the day right' },
  { id: 'lunch', label: 'Lunch', capacity: 1, hint: 'Midday fuel' },
  { id: 'dinner', label: 'Dinner', capacity: 1, hint: 'End on a high note' },
  { id: 'snacks', label: 'Snacks', capacity: 2, hint: 'Up to 2 snacks' },
]

/** FDA Daily Values (21 CFR 101.36) — general population reference. */
const DV = {
  calories:  { label: 'Calories',    dv: 2000, unit: 'kcal', kind: 'ref' },
  protein:   { label: 'Protein',     dv: 50,   unit: 'g' },
  carbs:     { label: 'Carbs',       dv: 275,  unit: 'g' },
  fat:       { label: 'Total fat',   dv: 78,   unit: 'g' },
  fiber:     { label: 'Fiber',       dv: 28,   unit: 'g' },
  iron:      { label: 'Iron',        dv: 18,   unit: 'mg' },
  calcium:   { label: 'Calcium',     dv: 1300, unit: 'mg' },
  vitaminC:  { label: 'Vitamin C',   dv: 90,   unit: 'mg' },
  potassium: { label: 'Potassium',   dv: 4700, unit: 'mg' },
  magnesium: { label: 'Magnesium',   dv: 420,  unit: 'mg' },
  zinc:      { label: 'Zinc',        dv: 11,   unit: 'mg' },
  folate:    { label: 'Folate',      dv: 400,  unit: 'mcg' },
  sodium:    { label: 'Sodium',      dv: 2300, unit: 'mg', kind: 'limit' },
}
const DV_KEYS = Object.keys(DV)

const GOALS = [
  {
    id: 'balanced',
    label: 'Balanced day',
    desc: 'A little of everything',
  },
  {
    id: 'protein',
    label: 'High-protein day',
    desc: 'Aims for 100g+ protein',
    target: { key: 'protein', amount: 100, unit: 'g' },
  },
  {
    id: 'iron',
    label: 'Iron-focused day',
    desc: 'Emphasizes iron + vitamin C pairings',
    emphasize: 'iron',
  },
]

const EMPTY_DAY = { breakfast: [], lunch: [], dinner: [], snacks: [] }

const recipeBySlug = Object.fromEntries(recipes.map((r) => [r.slug, r]))

/** Keep only known recipe slugs, capped at each slot's capacity. */
function cleanDay(parsed) {
  const clean = { ...EMPTY_DAY }
  for (const s of SLOTS) {
    const slugs = parsed && Array.isArray(parsed[s.id]) ? parsed[s.id] : []
    clean[s.id] = slugs.filter((slug) => recipeBySlug[slug]).slice(0, s.capacity)
  }
  return clean
}

function loadDay() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return cleanDay(JSON.parse(raw))
  } catch {
    return null
  }
}

function writeDay(day) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(day))
  } catch {
    /* storage unavailable — the builder still works for the session */
  }
}

const isDayEmpty = (day) => !day || SLOTS.every((s) => (day[s.id] || []).length === 0)

function fmt(n) {
  if (n == null || Number.isNaN(n)) return '0'
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? String(r) : String(r)
}

/** Qualitative pairing check: meaningful iron AND vitamin C in one serving. */
function hasPairing(recipe) {
  const iron = recipe?.nutrition?.iron?.amount ?? 0
  const vitC = recipe?.nutrition?.vitaminC?.amount ?? 0
  return iron >= 2 && vitC >= 10
}

/* ------------------------------------------------------------------ */
/* Recipe picker modal (bottom sheet on mobile, dialog on desktop)      */
/* ------------------------------------------------------------------ */

function RecipePicker({ slot, goal, usedSlugs, onPick, onClose }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = recipes.filter((r) => {
      if (!q) return true
      const hay = `${r.title} ${r.description} ${(r.tags?.nutrients || []).join(' ')}`.toLowerCase()
      return hay.includes(q)
    })
    if (goal === 'protein') {
      list = [...list].sort((a, b) => (b.nutrition?.protein?.amount ?? 0) - (a.nutrition?.protein?.amount ?? 0))
    } else if (goal === 'iron') {
      list = [...list].sort((a, b) => (b.nutrition?.iron?.amount ?? 0) - (a.nutrition?.iron?.amount ?? 0))
    } else if (slot) {
      // Balanced: recipes tagged for this meal type float to the top.
      const meal = slot.id === 'snacks' ? 'snack' : slot.id
      list = [...list].sort((a, b) => {
        const am = (a.tags?.meals || []).includes(meal) ? 0 : 1
        const bm = (b.tags?.meals || []).includes(meal) ? 0 : 1
        return am - bm
      })
    }
    return list
  }, [query, goal, slot])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Choose a recipe for ${slot.label}`}
    >
      <button
        type="button"
        aria-label="Close recipe picker"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-forest-deep/60 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        className="relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-cream shadow-2xl sm:max-h-[80vh] sm:max-w-2xl sm:rounded-3xl"
      >
        <div className="border-b border-forest/10 px-5 pb-4 pt-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-forest">
              Add to {slot.label}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-forest transition hover:bg-forest/10"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <label htmlFor="picker-search" className="sr-only">Search recipes</label>
          <input
            ref={inputRef}
            id="picker-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes…"
            className="mt-3 w-full rounded-full border border-forest/20 bg-white px-5 py-3 text-forest placeholder:text-forest/50 focus:border-ember focus:outline-none"
          />
          <p className="mt-2 text-xs text-forest/70">
            {goal === 'protein' && 'Sorted by protein — highest first.'}
            {goal === 'iron' && 'Sorted by iron — highest first.'}
            {goal === 'balanced' && `Showing ${slot.label.toLowerCase()} recipes first.`}
          </p>
        </div>

        <ul className="flex-1 overflow-y-auto px-4 py-4 sm:px-6" aria-label="Recipes">
          {results.map((r) => {
            const used = usedSlugs.has(r.slug)
            const n = r.nutrition || {}
            return (
              <li key={r.slug} className="flex items-center gap-3 border-b border-forest/10 py-3 last:border-0">
                <ResponsiveImage
                  src={r.image}
                  alt=""
                  width={64}
                  height={64}
                  sizes="64px"
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-forest">{r.title}</p>
                  <p className="mt-0.5 text-sm text-forest/75">
                    {fmt(n.protein?.amount)}g protein · {fmt(n.iron?.amount)}mg iron · {fmt(n.calories?.amount)} kcal
                  </p>
                </div>
                {used ? (
                  <span className="shrink-0 rounded-full bg-forest/10 px-4 py-2 text-sm font-semibold text-forest/70">
                    Added
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPick(slot.id, r.slug)}
                    className="shrink-0 rounded-full bg-ember-dark px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    Add
                  </button>
                )}
              </li>
            )
          })}
          {results.length === 0 && (
            <li className="py-10 text-center text-forest/70">
              No recipes match “{query}”. Try a different search.
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Meal slot card                                                       */
/* ------------------------------------------------------------------ */

function SlotCard({ slot, slugs, goal, onAdd, onRemove }) {
  const full = slugs.length >= slot.capacity
  return (
    <section
      aria-label={slot.label}
      className="rounded-2xl border border-forest/15 bg-white/60 p-4 sm:p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-forest">{slot.label}</h2>
        <span className="text-xs text-forest/70">{slot.hint}</span>
      </div>

      <div className="mt-3 space-y-3">
        {slugs.map((slug) => {
          const r = recipeBySlug[slug]
          if (!r) return null
          const n = r.nutrition || {}
          const pairing = hasPairing(r)
          return (
            <div key={slug} className="rounded-xl border border-forest/10 bg-cream p-3">
              <div className="flex items-center gap-3">
                <ResponsiveImage
                  src={r.image}
                  alt=""
                  width={56}
                  height={56}
                  sizes="56px"
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/recipes/${r.slug}`}
                    className="block truncate font-semibold text-forest underline-offset-2 hover:text-ember-dark hover:underline"
                  >
                    {r.title}
                  </Link>
                  <p className="mt-0.5 text-sm text-forest/75">
                    {fmt(n.protein?.amount)}g protein · {fmt(n.iron?.amount)}mg iron · {fmt(n.calories?.amount)} kcal
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(slot.id, slug)}
                  aria-label={`Remove ${r.title} from ${slot.label}`}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-forest/70 transition hover:bg-forest/10 hover:text-ember-dark"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              {pairing && (
                <p className="mt-2 rounded-lg bg-forest/5 px-3 py-2 text-xs leading-relaxed text-forest/85">
                  <span className="font-semibold text-forest">Good pairing:</span> this meal has
                  iron and vitamin C — vitamin C helps your body absorb iron from food.
                </p>
              )}
            </div>
          )
        })}

        {slugs.length === 0 && (
          <p className="rounded-xl border border-dashed border-forest/25 px-4 py-5 text-center text-sm text-forest/70">
            Nothing here yet.
          </p>
        )}

        {!full && (
          <button
            type="button"
            onClick={() => onAdd(slot.id)}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border-2 border-dashed border-ember/50 px-5 py-2.5 font-semibold text-ember-dark transition hover:border-ember hover:bg-ember/5"
          >
            <span aria-hidden="true" className="text-lg leading-none">+</span>
            Add recipe
          </button>
        )}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Daily-value progress bar                                             */
/* ------------------------------------------------------------------ */

function DvBar({ nutrientKey, amount, emphasize }) {
  const meta = DV[nutrientKey]
  const pct = meta.dv > 0 ? (amount / meta.dv) * 100 : 0
  const barPct = Math.min(pct, 100)
  const over = meta.kind === 'limit' && pct > 100
  return (
    <div className={`rounded-xl px-3 py-2.5 ${emphasize ? 'bg-ember/10 ring-1 ring-ember/40' : ''}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 text-sm font-medium text-forest">
          {meta.label}
          {meta.kind === 'limit' && <span className="text-forest/60"> · limit</span>}
          {meta.kind === 'ref' && <span className="text-forest/60"> · ref</span>}
        </span>
        <span className="shrink-0 whitespace-nowrap text-sm text-forest/85">
          <strong className="font-semibold text-forest">{fmt(amount)}{meta.unit}</strong>
          {' '}· {Math.round(pct)}%
        </span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-forest/10"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${meta.label}: ${Math.round(pct)} percent of daily value`}
      >
        <div
          className={`h-full rounded-full transition-[width] ${over ? 'bg-ember' : 'bg-forest'}`}
          style={{ width: `${barPct}%` }}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function DayBuilderPage() {
  // SSR-safe: start empty (matches prerender), hydrate from localStorage after mount.
  const { user } = useAuth()
  const [day, setDay] = useState(EMPTY_DAY)
  const [goal, setGoal] = useState('balanced')
  const [pickerSlotId, setPickerSlotId] = useState(null)
  const [hydrated, setHydrated] = useState(false)
  const [syncState, setSyncState] = useState('idle') // idle | saving | saved | error
  const cloudSyncedFor = useRef(null)

  useEffect(() => {
    const saved = loadDay()
    if (saved) setDay(saved)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    writeDay(day)
  }, [day, hydrated])

  // Cloud sync (Supabase `day_plans`). Merge rule, documented:
  // - If the cloud has a plan and this device has nothing → adopt the cloud plan.
  // - If this device already has a plan → the local plan wins and is pushed up.
  // - localStorage is always kept as the local cache, regardless.
  useEffect(() => {
    if (!isSupabaseConfigured || !user || typeof window === 'undefined') return
    if (cloudSyncedFor.current === user.id) return
    cloudSyncedFor.current = user.id
    ;(async () => {
      try {
        const client = await getSupabase()
        if (!client) return
        const { data, error } = await client
          .from('day_plans')
          .select('plan')
          .eq('user_id', user.id)
          .maybeSingle()
        if (error) throw error
        const local = loadDay()
        if (data?.plan && isDayEmpty(local)) {
          const clean = cleanDay(data.plan)
          setDay(clean)
          writeDay(clean)
        } else if (!isDayEmpty(local)) {
          await client.from('day_plans').upsert(
            { user_id: user.id, plan: local, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          )
        }
      } catch {
        /* offline or table not created yet — local plan keeps working */
      }
    })()
  }, [user])

  // Debounced upsert to the cloud on every change while signed in.
  useEffect(() => {
    if (!hydrated || !isSupabaseConfigured || !user) return
    setSyncState('saving')
    const t = setTimeout(async () => {
      try {
        const client = await getSupabase()
        if (!client) {
          setSyncState('idle')
          return
        }
        const { error } = await client.from('day_plans').upsert(
          { user_id: user.id, plan: day, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        setSyncState(error ? 'error' : 'saved')
      } catch {
        setSyncState('error')
      }
    }, 1500)
    return () => clearTimeout(t)
  }, [day, hydrated, user])

  // On sign-out, allow the next sign-in to re-run the cloud merge.
  useEffect(() => {
    if (!user) {
      cloudSyncedFor.current = null
      setSyncState('idle')
    }
  }, [user])

  const activeGoal = GOALS.find((g) => g.id === goal) || GOALS[0]

  const totals = useMemo(() => {
    const t = Object.fromEntries(DV_KEYS.map((k) => [k, 0]))
    for (const s of SLOTS) {
      for (const slug of day[s.id]) {
        const n = recipeBySlug[slug]?.nutrition
        if (!n) continue
        for (const k of DV_KEYS) {
          if (n[k]) t[k] += n[k].amount
        }
      }
    }
    return t
  }, [day])

  const chosenCount = SLOTS.reduce((acc, s) => acc + day[s.id].length, 0)
  const usedSlugs = useMemo(
    () => new Set(SLOTS.flatMap((s) => day[s.id])),
    [day]
  )

  const pickerSlot = SLOTS.find((s) => s.id === pickerSlotId) || null

  const pick = (slotId, slug) => {
    setDay((d) => {
      const slot = SLOTS.find((s) => s.id === slotId)
      if (!slot || d[slotId].includes(slug) || d[slotId].length >= slot.capacity) return d
      return { ...d, [slotId]: [...d[slotId], slug] }
    })
    setPickerSlotId(null)
  }

  const remove = (slotId, slug) => {
    setDay((d) => ({ ...d, [slotId]: d[slotId].filter((s) => s !== slug) }))
  }

  const clearDay = () => {
    if (chosenCount === 0) return
    if (window.confirm('Clear your whole day? This cannot be undone.')) {
      setDay(EMPTY_DAY)
    }
  }

  const canonical = absUrl('/day-builder')
  const title = 'Build Your Day | The Recipe Seeker'
  const description =
    'Plan a full day of meals and see your total nutrition — protein, iron, fiber, vitamins and more — summed from real per-serving recipe data.'

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Build Your Day',
    description,
    url: canonical,
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Build Your Day', item: canonical },
    ],
  }

  return (
    <>
      <Seo
        title={title}
        description={description}
        canonical={canonical}
        image={absImage('/images/hero-bowl.webp')}
      />
      <JsonLd data={[webPageLd, breadcrumbLd]} />

      {/* ---- Interactive builder (screen only) ---- */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 print:hidden">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Build Your Day' }]} />

        <Reveal as="p" immediate variant="up" className="mt-6 text-sm font-semibold uppercase tracking-widest text-ember-dark">
          Interactive tool
        </Reveal>
        <Reveal as="h1" immediate variant="up" delay={80} className="mt-2 max-w-2xl font-display text-4xl font-semibold leading-tight text-forest sm:text-5xl">
          Build Your Day
        </Reveal>
        <Reveal as="p" immediate variant="fade" delay={160} className="mt-4 max-w-2xl text-lg leading-relaxed text-forest/80">
          Pick a recipe for each meal and watch your day's nutrition add up —
          protein, iron, fiber, vitamins and more, from real per-serving data.
        </Reveal>

        {/* Goal presets */}
        <Reveal variant="up" className="mt-8">
          <div role="group" aria-label="Day goal" className="flex flex-wrap gap-3">
            {GOALS.map((g) => {
              const active = g.id === goal
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoal(g.id)}
                  aria-pressed={active}
                  className={`min-h-[44px] rounded-full border-2 px-5 py-2.5 text-left transition ${
                    active
                      ? 'border-forest bg-forest text-cream shadow-sm'
                      : 'border-forest/20 bg-white/60 text-forest hover:border-forest/50'
                  }`}
                >
                  <span className="block text-sm font-semibold">{g.label}</span>
                  <span className={`block text-xs ${active ? 'text-cream/80' : 'text-forest/70'}`}>
                    {g.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </Reveal>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Meal slots */}
          <div className="min-w-0 space-y-6">
            {SLOTS.map((slot, i) => (
              <Reveal key={slot.id} variant="up" delay={Math.min(i * 70, 210)}>
                <SlotCard
                  slot={slot}
                  slugs={day[slot.id]}
                  goal={goal}
                  onAdd={setPickerSlotId}
                  onRemove={remove}
                />
              </Reveal>
            ))}
          </div>

          {/* Day totals (sticky on desktop) */}
          <aside aria-label="Day totals" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-forest/15 bg-forest p-5 text-cream sm:p-6">
              <h2 className="font-display text-xl font-semibold">Your day so far</h2>
              <p className="mt-1 text-sm text-cream/75">
                {chosenCount === 0
                  ? 'Add recipes to see your totals.'
                  : `${chosenCount} recipe${chosenCount === 1 ? '' : 's'} · totals per serving`}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-cream/65">
                Based on general FDA Daily Values — not personal medical advice.
              </p>

              {chosenCount > 0 ? (
                <div className="mt-4 space-y-1 rounded-xl bg-cream p-3">
                  {activeGoal.target && (
                    <div className="rounded-xl bg-ember/10 px-3 py-2.5 ring-1 ring-ember/40">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-forest">
                          Protein target: {activeGoal.target.amount}{activeGoal.target.unit}+
                        </span>
                        <span className="text-sm text-forest/85">
                          {totals.protein >= activeGoal.target.amount ? (
                            <strong className="font-semibold text-forest">Reached ✓</strong>
                          ) : (
                            <>{fmt(activeGoal.target.amount - totals.protein)}g to go</>
                          )}
                        </span>
                      </div>
                      <div
                        className="mt-1.5 h-2 overflow-hidden rounded-full bg-forest/10"
                        role="progressbar"
                        aria-valuenow={Math.min(Math.round((totals.protein / activeGoal.target.amount) * 100), 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Protein target: ${Math.round((totals.protein / activeGoal.target.amount) * 100)} percent`}
                      >
                        <div
                          className="h-full rounded-full bg-ember-dark"
                          style={{ width: `${Math.min((totals.protein / activeGoal.target.amount) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {DV_KEYS.map((k) => (
                    <DvBar
                      key={k}
                      nutrientKey={k}
                      amount={totals[k]}
                      emphasize={activeGoal.emphasize === k}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-cream/10 p-6 text-center">
                  <p className="text-cream/85">
                    Your plate is empty. Add a breakfast, lunch, dinner or snack
                    to start building your day.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPickerSlotId('breakfast')}
                    className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-ember-dark px-6 py-2.5 font-semibold text-white transition hover:brightness-110"
                  >
                    Add breakfast
                  </button>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <PrintButton className="min-h-[44px] px-5 py-2.5 text-sm" label="Print day" />
                <button
                  type="button"
                  onClick={clearDay}
                  disabled={chosenCount === 0}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-cream/40 px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-cream/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Clear day
                </button>
              </div>
              <p className="mt-3 text-xs text-cream/60">
                Your day is saved automatically in this browser.
              </p>
              {isSupabaseConfigured && user && syncState !== 'idle' && (
                <p className="mt-1 text-xs text-cream/60" role="status">
                  {syncState === 'saving'
                    ? 'Saving to your account…'
                    : syncState === 'saved'
                      ? 'Saved to your account ✓'
                      : 'Couldn’t reach your account — kept on this device.'}
                </p>
              )}
            </div>
          </aside>
        </div>

        <div className="mt-10 max-w-3xl">
          <MedicalDisclaimer />
        </div>

        {pickerSlot && (
          <RecipePicker
            slot={pickerSlot}
            goal={goal}
            usedSlugs={usedSlugs}
            onPick={pick}
            onClose={() => setPickerSlotId(null)}
          />
        )}
      </div>

      {/* ---- Printable summary (print only) ---- */}
      <div className="hidden print:block">
        <h1 style={{ fontSize: '22pt', marginBottom: '4pt' }}>My Day — The Recipe Seeker</h1>
        <p style={{ marginBottom: '12pt' }}>
          {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        {SLOTS.map((slot) => (
          <div key={slot.id} style={{ marginBottom: '10pt' }}>
            <h2 style={{ fontSize: '14pt', marginBottom: '4pt' }}>{slot.label}</h2>
            {day[slot.id].length === 0 ? (
              <p>—</p>
            ) : (
              <ul>
                {day[slot.id].map((slug) => {
                  const r = recipeBySlug[slug]
                  const n = r?.nutrition || {}
                  return (
                    <li key={slug}>
                      {r?.title} — {fmt(n.protein?.amount)}g protein · {fmt(n.iron?.amount)}mg iron · {fmt(n.calories?.amount)} kcal
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ))}
        <h2 style={{ fontSize: '14pt', margin: '12pt 0 4pt' }}>Day totals</h2>
        <table>
          <tbody>
            {DV_KEYS.map((k) => (
              <tr key={k}>
                <td style={{ paddingRight: '16pt' }}>{DV[k].label}</td>
                <td style={{ paddingRight: '16pt' }}>{fmt(totals[k])}{DV[k].unit}</td>
                <td>{Math.round((totals[k] / DV[k].dv) * 100)}% DV</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: '12pt', fontSize: '9pt' }}>
          Based on general FDA Daily Values. General nutrition information only — not medical advice.
        </p>
      </div>
    </>
  )
}
