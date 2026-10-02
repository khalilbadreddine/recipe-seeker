import React, { useCallback, useEffect, useRef, useState } from 'react'
import Icon from './Icon'

/**
 * Full-screen, step-by-step cooking view: big type, one step at a time,
 * keyboard + swipe navigation, and a Screen Wake Lock so the phone doesn't
 * sleep mid-recipe (where the browser supports it).
 */
export default function CookMode({ recipe, open, onClose }) {
  const [step, setStep] = useState(0)
  const [awake, setAwake] = useState(false)
  const lockRef = useRef(null)
  const dialogRef = useRef(null)
  const touchX = useRef(null)
  const total = recipe.steps.length
  const isIngredients = step === 0
  const current = isIngredients ? null : recipe.steps[step - 1]

  const go = useCallback((delta) => setStep((s) => Math.max(0, Math.min(total, s + delta))), [total])

  useEffect(() => {
    if (!open) return
    setStep(0)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    let cancelled = false
    if ('wakeLock' in navigator) {
      navigator.wakeLock
        .request('screen')
        .then((lock) => {
          if (cancelled) return lock.release()
          lockRef.current = lock
          setAwake(true)
          lock.addEventListener('release', () => setAwake(false))
        })
        .catch(() => setAwake(false))
    }
    return () => {
      cancelled = true
      document.body.style.overflow = prevOverflow
      lockRef.current?.release().catch(() => {})
      lockRef.current = null
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, go, onClose])

  if (!open) return null

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Cook mode: ${recipe.title}`}
      className="no-print fixed inset-0 z-[60] flex flex-col bg-ink text-paper outline-none"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1)
        touchX.current = null
      }}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zest">Cook mode</p>
          <p className="truncate font-display text-lg font-bold">{recipe.title}</p>
        </div>
        <button type="button" onClick={onClose} className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-paper/10 hover:bg-paper/20" aria-label="Exit cook mode">
          <Icon name="close" className="h-6 w-6" />
        </button>
      </div>

      <div className="flex gap-1 px-4 sm:px-8" aria-hidden="true">
        {Array.from({ length: total + 1 }).map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-zest' : 'bg-paper/15'}`} />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 sm:py-12">
        <div key={step} className="pop-in mx-auto max-w-3xl">
          {isIngredients ? (
            <>
              <p className="font-display text-lg text-paper/60">Before you start</p>
              <h2 className="mt-2 font-display text-4xl font-extrabold sm:text-5xl">Gather your ingredients</h2>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="rounded-2xl bg-paper/5 px-4 py-3 text-lg">
                    <strong className="text-zest">{ing.amount}</strong> {ing.item}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className="font-display text-lg text-paper/60" aria-live="polite">
                Step {step} of {total}
              </p>
              <h2 className="mt-2 font-display text-4xl font-extrabold leading-tight sm:text-5xl">{current.title}</h2>
              <p className="mt-6 text-2xl leading-relaxed text-paper/90 sm:text-3xl sm:leading-relaxed">{current.text}</p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-paper/10 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-8">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={step === 0}
          className="inline-flex min-h-[56px] items-center gap-2 rounded-full bg-paper/10 px-6 text-lg font-semibold hover:bg-paper/20 disabled:opacity-30"
        >
          <Icon name="arrowLeft" className="h-5 w-5" /> Back
        </button>
        <p className="hidden text-sm text-paper/50 sm:block">
          {awake ? 'Screen stays awake while you cook' : 'Use ← → keys or swipe'}
        </p>
        {step < total ? (
          <button type="button" onClick={() => go(1)} className="inline-flex min-h-[56px] items-center gap-2 rounded-full bg-zest px-8 text-lg font-bold text-ink hover:brightness-95">
            {isIngredients ? 'Start cooking' : 'Next'} <Icon name="arrowRight" className="h-5 w-5" strokeWidth={2.4} />
          </button>
        ) : (
          <button type="button" onClick={onClose} className="inline-flex min-h-[56px] items-center gap-2 rounded-full bg-zest px-8 text-lg font-bold text-ink hover:brightness-95">
            <Icon name="check" className="h-5 w-5" strokeWidth={2.4} /> Done, enjoy!
          </button>
        )}
      </div>
    </div>
  )
}
