#!/usr/bin/env node
/**
 * Local dev server for the Vercel functions in /api.
 *
 *   node scripts/dev-api.mjs        # serves http://localhost:3001/api/<name>
 *
 * The Vite dev server proxies /api to port 3001, so with this running,
 * `npm --prefix client run dev` talks to the real chat/subscribe handlers.
 * Reads keys from the repo-root .env (same names as in Vercel).
 */
import http from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envFile = join(root, '.env')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const PORT = Number(process.env.API_PORT || 3001)

http
  .createServer(async (req, res) => {
    const name = (req.url.match(/^\/api\/([a-z0-9-]+)/) || [])[1]
    const file = name && join(root, 'api', `${name}.mjs`)
    if (!file || !existsSync(file)) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      return res.end('{"error":"not found"}')
    }
    try {
      const { default: handler } = await import(pathToFileURL(file).href)
      await handler(req, res)
    } catch (e) {
      console.error(e)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end('{"error":"internal"}')
    }
  })
  .listen(PORT, () => console.log(`api dev server: http://localhost:${PORT}/api/{chat,subscribe}`))
