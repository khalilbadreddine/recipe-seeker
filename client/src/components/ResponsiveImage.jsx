import React from 'react'

/**
 * Responsive image wired to the pipeline-generated variants:
 * `<basename>-480w.webp` / `-800w.webp` / `-1200w.webp` live next to the
 * full-size file in `client/public/images/`. The `src` stays as the fallback
 * (and the largest source for very wide screens).
 *
 * Keep passing explicit width/height — CLS depends on it.
 */
export function srcSetFor(src) {
  const m = typeof src === 'string' && src.match(/^(.*)\.webp$/)
  if (!m) return undefined
  const base = m[1]
  return `${base}-480w.webp 480w, ${base}-800w.webp 800w, ${base}-1200w.webp 1200w`
}

export default function ResponsiveImage({ src, sizes, ...rest }) {
  // Spread lowercase `srcset`: React 19 SSR would otherwise emit `srcSet`.
  // (Browsers parse both, but lowercase is the canonical form.)
  return <img src={src} {...(srcSetFor(src) ? { srcset: srcSetFor(src) } : {})} sizes={sizes} {...rest} />
}
