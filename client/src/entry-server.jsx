import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'

/**
 * SSR entry used by scripts/prerender.mjs.
 *
 * react-helmet-async v3 on React 19 renders <title>/<meta>/<link> as real
 * elements via React 19's hoistable-tags support (it no longer populates
 * `context.helmet`). Those tags land inline at the top of the rendered markup,
 * so we extract them here and hand them back as `head` for the prerenderer to
 * inject into <head> of the static file. crawlers + social scrapers get real
 * head tags; React 19 hydration reconciles the hoistable tags without warnings.
 */
const HEAD_TAG_RE = /<(title|meta|link)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g

export function render(url) {
  const raw = renderToString(
    <HelmetProvider>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </HelmetProvider>,
  )
  const headTags = []
  const html = raw.replace(HEAD_TAG_RE, (m) => {
    headTags.push(m)
    return ''
  })
  return { html, head: headTags.join('\n    ') }
}
