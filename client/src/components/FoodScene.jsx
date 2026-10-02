import React, { useEffect, useRef } from 'react'

/** Should this visitor get the 3D scene? Never for reduced motion, data saver or no WebGL. */
function canRun3D(minWidth) {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  if (minWidth && !window.matchMedia(`(min-width: ${minWidth}px)`).matches) return false
  if (navigator.connection?.saveData) return false
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

const whenIdle = (fn) =>
  'requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 2500 }) : window.setTimeout(fn, 1200)
const cancelIdle = (id) => ('cancelIdleCallback' in window ? window.cancelIdleCallback(id) : window.clearTimeout(id))

/**
 * Decorative 3D food field (see src/three/foodScene.js). Renders an empty,
 * aria-hidden box on the server; the three.js chunk is fetched only after the
 * page is idle and only when the device can afford it. Purely visual: all
 * content and links live in normal HTML.
 */
export default function FoodScene({ nutrient = 'all', variant = 'hero', minWidth = 0, className = '' }) {
  const ref = useRef(null)
  const engine = useRef(null)
  const latest = useRef(nutrient)
  latest.current = nutrient

  useEffect(() => {
    if (!canRun3D(minWidth)) return
    let cancelled = false
    const id = whenIdle(() => {
      import('../three/foodScene.js')
        .then(({ createFoodScene }) => {
          if (cancelled || !ref.current || !ref.current.clientWidth) return
          engine.current = createFoodScene(ref.current, { nutrient: latest.current, variant })
        })
        .catch(() => {
          /* decorative only: the page works without it */
        })
    })
    return () => {
      cancelled = true
      cancelIdle(id)
      engine.current?.destroy()
      engine.current = null
    }
  }, [variant, minWidth])

  useEffect(() => {
    engine.current?.setNutrient(nutrient)
  }, [nutrient])

  return <div ref={ref} aria-hidden="true" className={`pointer-events-none ${className}`} />
}
