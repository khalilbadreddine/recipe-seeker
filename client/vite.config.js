import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { buildSiteIndex, DETAIL_KINDS } from './scripts/site-index.mjs'

const DATA_FILE = fileURLToPath(new URL('./src/data/recipes.json', import.meta.url))
const VIRTUAL_ID = 'virtual:site-index'
const loadData = () => JSON.parse(readFileSync(DATA_FILE, 'utf8'))

/**
 * Site data, split for speed:
 *   import index from 'virtual:site-index'  → slim index shipped to every page
 *   /data/{recipes,posts,guides}/<slug>.json → full detail, fetched per page
 * Detail files are emitted into the client build and served by the dev server,
 * so src/data/recipes.json stays the single source of truth.
 */
function siteData() {
  let isSsr = false
  return {
    name: 'site-data',
    configResolved(config) {
      isSsr = Boolean(config.build.ssr)
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return '\0' + VIRTUAL_ID
    },
    load(id) {
      if (id !== '\0' + VIRTUAL_ID) return
      this.addWatchFile(DATA_FILE)
      return `export default ${JSON.stringify(buildSiteIndex(loadData()))}`
    },
    generateBundle() {
      if (isSsr) return
      const data = loadData()
      for (const kind of DETAIL_KINDS) {
        for (const item of data[kind] || []) {
          this.emitFile({ type: 'asset', fileName: `data/${kind}/${item.slug}.json`, source: JSON.stringify(item) })
        }
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const m = (req.url || '').match(/^\/data\/(recipes|posts|guides)\/([a-z0-9-]+)\.json$/)
        if (!m) return next()
        const item = (loadData()[m[1]] || []).find((x) => x.slug === m[2])
        res.setHeader('Content-Type', 'application/json')
        if (!item) {
          res.statusCode = 404
          return res.end('{}')
        }
        res.end(JSON.stringify(item))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), siteData()],
  server: {
    // Dev only: /api → the Vercel functions served by `npm run api:dev` on :3001.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
