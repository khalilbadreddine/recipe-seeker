#!/usr/bin/env node
/**
 * Image generator (sharp).
 *
 *   node scripts/generate-images.mjs pins [--force]
 *     1000×1500 Pinterest pins for every recipe and blog post →
 *     client/public/pins/{recipes,blog}/<slug>.jpg, plus a manifest at
 *     client/src/data/pins.json (the site uses a pin only if it's listed).
 *     Text is drawn with system fonts (DejaVu Sans), so run this locally or in
 *     GitHub Actions (.github/workflows/pins.yml), not in the Vercel build.
 *     Pinterest-safe copy: dish name, meal/time and plain per-serving numbers,
 *     never claim-style labels like "HIGH-FIBER".
 *
 *   node scripts/generate-images.mjs email
 *     600px-wide JPEG copies of recipe photos → client/dist/email/<slug>.jpg,
 *     because many email apps can't show WebP. Runs after the client build.
 */
import sharp from 'sharp'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'client', 'public')
const data = JSON.parse(readFileSync(join(ROOT, 'client', 'src', 'data', 'recipes.json'), 'utf8'))
const [mode = 'pins', ...flags] = process.argv.slice(2)
const FORCE = flags.includes('--force')

const W = 1000
const H = 1500
const PANEL = 560
const INK = '#16201B'
const ZEST = '#D7F25C'
const PAPER = '#F6F4EE'
const FONT = "DejaVu Sans, Arial, Helvetica, sans-serif"

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c])
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10))

/** Greedy word wrap by an approximate character budget. */
function wrap(text, maxChars) {
  const lines = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    if ((line + ' ' + word).trim().length > maxChars && line) {
      lines.push(line)
      line = word
    } else line = (line + ' ' + word).trim()
  }
  if (line) lines.push(line)
  return lines
}

/** Biggest title size that fits in 3 lines. DejaVu Sans Bold ≈ 0.62em per char. */
function fitTitle(title) {
  for (const size of [92, 80, 70, 62, 54]) {
    const lines = wrap(title, Math.floor((W - 120) / (size * 0.62)))
    if (lines.length <= 3) return { size, lines }
  }
  return { size: 54, lines: wrap(title, 26).slice(0, 3) }
}

function panelSvg({ kicker, title, subline }) {
  const { size, lines } = fitTitle(title)
  const lineH = Math.round(size * 1.08)
  const blockH = lines.length * lineH
  const top = 150 + Math.round((PANEL - 150 - 120 - blockH) / 2)
  const titleSvg = lines
    .map((l, i) => `<text x="${W / 2}" y="${top + i * lineH + size * 0.8}" font-size="${size}" font-weight="700" fill="${PAPER}" text-anchor="middle" font-family="${FONT}">${esc(l)}</text>`)
    .join('')
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect x="0" y="0" width="${W}" height="${PANEL}" fill="${INK}"/>
  <rect x="${W / 2 - 230}" y="78" width="460" height="56" rx="28" fill="${ZEST}"/>
  <text x="${W / 2}" y="116" font-size="26" font-weight="700" letter-spacing="4" fill="${INK}" text-anchor="middle" font-family="${FONT}">${esc(kicker)}</text>
  ${titleSvg}
  ${subline ? `<text x="${W / 2}" y="${PANEL - 70}" font-size="34" font-weight="700" fill="${PAPER}" fill-opacity="0.85" text-anchor="middle" font-family="${FONT}">${esc(subline)}</text>` : ''}
  <rect x="${W / 2 - 230}" y="${H - 104}" width="460" height="64" rx="32" fill="${INK}" fill-opacity="0.88"/>
  <text x="${W / 2}" y="${H - 61}" font-size="30" font-weight="700" fill="${PAPER}" text-anchor="middle" font-family="${FONT}">Recipe<tspan fill="${ZEST}">Seeker</tspan></text>
</svg>`)
}

async function renderPin(imagePath, text, out) {
  const photo = await sharp(imagePath).resize(W, H - PANEL, { fit: 'cover', position: 'attention' }).toBuffer()
  await sharp({ create: { width: W, height: H, channels: 3, background: INK } })
    .composite([
      { input: photo, top: PANEL, left: 0 },
      { input: panelSvg(text), top: 0, left: 0 },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out)
}

function localImage(src) {
  if (!src || /^https?:/.test(src)) return null
  const p = join(PUBLIC, src.replace(/^\//, ''))
  return existsSync(p) ? p : null
}

const MEAL = { breakfast: 'BREAKFAST', brunch: 'BRUNCH', lunch: 'LUNCH', dinner: 'DINNER', snack: 'SNACK', dessert: 'DESSERT' }
const SHORT = { omega3: 'omega-3', vitaminC: 'vitamin C', vitaminD: 'vitamin D', b12: 'B12', vitaminA: 'vitamin A' }

function recipeText(r) {
  const meal = MEAL[(r.tags?.meals || [])[0]] || 'RECIPE'
  const facts = (r.keyNutrients || [])
    .slice(0, 2)
    .map((k) => {
      const key = k.key || k.id
      const n = r.nutrition?.[key]
      return n ? `${fmt(n.amount)}${n.unit} ${SHORT[key] || key}` : null
    })
    .filter(Boolean)
  return {
    kicker: `${meal} · ${r.totalMinutes} MIN`,
    title: r.title.replace(/\s*\(.*\)\s*$/, ''),
    subline: facts.length ? `${facts.join('  ·  ')} per serving` : '',
  }
}

function postText(p) {
  return { kicker: `${String(p.category || 'Nutrition').toUpperCase()} · GUIDE`, title: p.title.replace(/\s*\(.*\)\s*$/, ''), subline: 'Real food, real numbers' }
}

async function pins() {
  const manifest = { recipes: [], blog: [] }
  let made = 0
  for (const [kind, items, textFor] of [
    ['recipes', data.recipes, recipeText],
    ['blog', data.posts || [], postText],
  ]) {
    const dir = join(PUBLIC, 'pins', kind)
    mkdirSync(dir, { recursive: true })
    for (const item of items) {
      const out = join(dir, `${item.slug}.jpg`)
      const src = localImage(item.image)
      if (!src) continue
      if (FORCE || !existsSync(out)) {
        await renderPin(src, textFor(item), out)
        made++
      }
      manifest[kind].push(item.slug)
    }
  }
  writeFileSync(join(ROOT, 'client', 'src', 'data', 'pins.json'), JSON.stringify(manifest) + '\n')
  console.log(`[images] pins: ${made} generated, ${manifest.recipes.length} recipe + ${manifest.blog.length} blog pins in manifest`)
}

async function email() {
  const dist = join(ROOT, 'client', 'dist')
  if (!existsSync(dist)) throw new Error('client/dist not found: run the client build first')
  const dir = join(dist, 'email')
  mkdirSync(dir, { recursive: true })
  let made = 0
  for (const r of data.recipes) {
    const src = localImage(r.image.replace(/\.webp$/, '-800w.webp')) || localImage(r.image)
    if (!src) continue
    await sharp(src).resize(600, 400, { fit: 'cover', position: 'attention' }).jpeg({ quality: 78, mozjpeg: true }).toFile(join(dir, `${r.slug}.jpg`))
    made++
  }
  console.log(`[images] email: ${made} JPEGs → client/dist/email/`)
}

if (mode === 'pins') await pins()
else if (mode === 'email') await email()
else {
  console.error('usage: node scripts/generate-images.mjs pins [--force] | email')
  process.exit(1)
}
