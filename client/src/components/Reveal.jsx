import React, { useEffect, useRef, useState } from 'react'

/**
 * Reveal — scroll-triggered entrance animation wrapper. CSS + IntersectionObserver,
 * zero dependencies.
 *
 * SEO safety: the CSS hidden state only applies under `html.js-anim` (added by a
 * tiny inline script in index.html that runs before first paint when JS is on).
 * Prerendered HTML and no-JS crawlers therefore always see full content.
 * Reduced-motion users: all animation CSS lives inside
 * `@media (prefers-reduced-motion: no-preference)`, so they see content instantly.
 *
 * Props:
 *   as        — element tag to render (default 'div'); safe for h1/p/li/section…
 *   variant   — 'up' (rise 24px) | 'fade' (opacity only) | 'scale' (grow from .96)
 *   delay     — ms added as --reveal-delay, for staggering lists
 *   immediate — true for above-the-fold hero content: reveals on mount instead
 *               of waiting for the IntersectionObserver
 *
 * Never put Reveal directly on an element that already uses Tailwind transform
 * utilities (e.g. hover:-translate-y-1) — wrap it instead, so the
 * `.is-visible { transform: none }` reset can't fight the element's own motion.
 */
export default function Reveal({
  as: Tag = 'div',
  variant = 'up',
  delay = 0,
  immediate = false,
  className = '',
  style,
  children,
  ...rest
}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (immediate) {
      // Above the fold: wait a frame so the hidden state paints first and the
      // CSS transition actually runs instead of rendering already-visible.
      let raf2 = 0
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setVisible(true))
      })
      return () => {
        cancelAnimationFrame(raf1)
        cancelAnimationFrame(raf2)
      }
    }
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            io.unobserve(entry.target) // trigger once
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [immediate])

  const cls = `reveal reveal-${variant}${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`
  const mergedStyle = delay ? { ...style, '--reveal-delay': `${delay}ms` } : style
  return (
    <Tag ref={ref} className={cls} style={mergedStyle} {...rest}>
      {children}
    </Tag>
  )
}

/**
 * Parallax — gentle scroll parallax for hero media. Transform-only, rAF-throttled,
 * percentage-based drift (clamped to ±6% of the element's own height, ≈ ≤30px on
 * typical heroes) so it stays subtle and edge-safe on every screen size.
 *
 * Pair with a slightly scaled child (e.g. `scale-[1.15]`) inside an
 * `overflow-hidden` frame so edges never show while it drifts:
 *
 *   <div className="overflow-hidden rounded-[2rem]">
 *     <Parallax className="aspect-[4/3] w-full">
 *       <img className="h-full w-full scale-[1.15] object-cover" … />
 *     </Parallax>
 *   </div>
 *
 * Disabled entirely under prefers-reduced-motion. SSR-safe (effect only).
 */
export function Parallax({ children, className = '', style, speed = 0.08, ...rest }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let rafId = 0
    let ticking = false
    const update = () => {
      ticking = false
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || 1
      if (rect.bottom < -120 || rect.top > vh + 120 || rect.height === 0) return
      // Drift relative to viewport center, as a % of the element's own height.
      const driftPct = ((rect.top + rect.height / 2 - vh / 2) * speed / rect.height) * 100
      const y = Math.max(-6, Math.min(6, driftPct))
      el.style.transform = `translate3d(0px, ${y.toFixed(2)}%, 0px)`
    }
    const requestUpdate = () => {
      if (!ticking) {
        ticking = true
        rafId = requestAnimationFrame(update)
      }
    }
    update()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)
    return () => {
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
      cancelAnimationFrame(rafId)
      el.style.transform = ''
    }
  }, [speed])

  return (
    <div
      ref={ref}
      className={className}
      style={{ willChange: 'transform', ...style }}
      {...rest}
    >
      {children}
    </div>
  )
}
