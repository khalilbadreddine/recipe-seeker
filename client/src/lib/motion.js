/**
 * GSAP motion layer, bound per route by <MotionLayer /> in App.jsx (lazy chunk).
 * Opt in with data attributes; content is always in the HTML, and anything
 * already on screen when JS arrives is left alone (no flicker, no hidden text).
 *
 *   data-count="38" data-suffix="g"   count up when scrolled into view
 *   data-tilt="6"                     3D tilt toward the pointer (mouse/trackpad only)
 *   data-scrub-line                   scaleX 0→1 scrubbed by scroll (in [data-scrub-root])
 *   data-pop                          pop in when scrolled into view
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const belowFold = (el) => el.getBoundingClientRect().top > window.innerHeight * 0.95

function formatCount(value, decimals, suffix) {
  return `${value.toFixed(decimals)}${suffix}`
}

export function bindMotion(root) {
  if (!root) return () => {}
  const cleanups = []

  const ctx = gsap.context(() => {
    root.querySelectorAll('[data-count]').forEach((el) => {
      if (!belowFold(el)) return
      const raw = el.dataset.count
      const end = parseFloat(raw)
      if (!Number.isFinite(end)) return
      const decimals = (raw.split('.')[1] || '').length
      const suffix = el.dataset.suffix || ''
      const final = el.textContent
      const state = { v: 0 }
      el.textContent = formatCount(0, decimals, suffix)
      ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        once: true,
        onEnter: () =>
          gsap.to(state, {
            v: end,
            duration: 1.1,
            ease: 'power2.out',
            onUpdate: () => (el.textContent = formatCount(state.v, decimals, suffix)),
            onComplete: () => (el.textContent = final),
          }),
      })
      cleanups.push(() => (el.textContent = final))
    })

    root.querySelectorAll('[data-scrub-line]').forEach((el) => {
      gsap.fromTo(
        el,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: { trigger: el.closest('[data-scrub-root]') || el, start: 'top 80%', end: 'bottom 55%', scrub: 0.6 },
        },
      )
    })

    root.querySelectorAll('[data-pop]').forEach((el, i) => {
      if (!belowFold(el)) return
      gsap.from(el, {
        autoAlpha: 0,
        scale: 0.6,
        y: 12,
        duration: 0.7,
        delay: (i % 3) * 0.08,
        ease: 'back.out(2)',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      })
    })
  }, root)

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    root.querySelectorAll('[data-tilt]').forEach((el) => {
      const max = parseFloat(el.dataset.tilt) || 6
      gsap.set(el, { transformPerspective: 900, transformStyle: 'preserve-3d' })
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power3' })
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power3' })
      const move = (e) => {
        const r = el.getBoundingClientRect()
        ry(((e.clientX - r.left) / r.width - 0.5) * max * 2)
        rx(-((e.clientY - r.top) / r.height - 0.5) * max * 2)
      }
      const leave = () => {
        rx(0)
        ry(0)
      }
      el.addEventListener('pointermove', move)
      el.addEventListener('pointerleave', leave)
      cleanups.push(() => {
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerleave', leave)
        gsap.set(el, { clearProps: 'transform,transformPerspective,transformStyle' })
      })
    })
  }

  // Layout settles after images/fonts: keep trigger positions accurate.
  const refresh = () => ScrollTrigger.refresh()
  window.addEventListener('load', refresh)
  cleanups.push(() => window.removeEventListener('load', refresh))

  return () => {
    cleanups.forEach((fn) => fn())
    ctx.revert()
  }
}
