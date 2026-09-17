/**
 * Prerenderer — runs after `vite build` + the SSR bundle build.
 *
 *   vite build                                        → dist/ (client assets + index.html template)
 *   vite build --ssr src/entry-server.jsx --outDir dist-ssr
 *   node scripts/prerender.mjs                        → this file
 *
 * For every indexable route (from src/data/site.js `getIncludedRoutes`) it
 * renders the React tree to static HTML with react-dom/server, injects the
 * react-helmet-async head tags into <head>, and writes dist/<route>/index.html.
 * Also emits sitemap.xml, robots.txt, llms.txt and llms-full.txt, then removes dist-ssr/.
 * These four are generated HERE (not by scripts/generate-seo.mjs) so they always
 * match the exact set of prerendered routes — single source of truth.
 *
 * NOTE: this replaces vite-ssg (its React support was dropped in v24+; the
 * installed v28 is Vue-only). Same outcome — fully static HTML per route —
 * with no extra dependency.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const distSsr = join(root, 'dist-ssr')

const data = JSON.parse(readFileSync(join(root, 'src/data/recipes.json'), 'utf8'))
const SITE_URL = data.site.canonicalBase || 'https://recipe-seeker-client.vercel.app'

const routeFor = (path) => (path === '/' ? 'index.html' : `${path.replace(/^\//, '')}/index.html`)

async function main() {
  const { render } = await import(join(distSsr, 'entry-server.js'))
  const template = readFileSync(join(dist, 'index.html'), 'utf8')

  if (!template.includes('<!--ssr-head-->') || !template.includes('<!--ssr-body-->')) {
    throw new Error('index.html template is missing <!--ssr-head--> / <!--ssr-body--> placeholders')
  }

  // Routes are derived from the same data file the pages render —
  // the sitemap and the prerendered HTML can never disagree.
  const { recipes, nutrients, guides, posts } = data
  const routes = ['/', '/recipes', '/nutrients', '/search', '/day-builder', '/saved', '/fibermax-reset', '/about', '/disclaimer', '/privacy', '/contact', '/blog']
  recipes.forEach((r) => routes.push(`/recipes/${r.slug}`))
  nutrients.forEach((n) => routes.push(`/nutrients/${n.slug || n.key}`))
  guides.forEach((g) => routes.push(`/guides/${g.slug}`))
  ;(posts || []).forEach((p) => routes.push(`/blog/${p.slug}`))

  for (const route of routes) {
    const { html, head } = render(route)
    const page = template.replace('<!--ssr-head-->', head).replace('<!--ssr-body-->', html)
    const outFile = join(dist, routeFor(route))
    mkdirSync(dirname(outFile), { recursive: true })
    writeFileSync(outFile, page)
    console.log(`prerendered ${route} → ${outFile.replace(dist, 'dist')}`)
  }

  // 404 page (host-level fallback): render the catch-all client route.
  {
    const { html, head } = render('/this-page-does-not-exist')
    const page = template.replace('<!--ssr-head-->', head).replace('<!--ssr-body-->', html)
    writeFileSync(join(dist, '404.html'), page)
    console.log('prerendered /404.html')
  }

  writeSitemap(routes)
  writeRobots()
  writeLlmsTxt()
  writeLlmsFullTxt()

  rmSync(distSsr, { recursive: true, force: true })
  console.log('done — removed dist-ssr/')
}

function writeSitemap(routes) {
  const today = new Date().toISOString().slice(0, 10)
  const lastmodFor = (route) => {
    const recipe = data.recipes.find((r) => route === `/recipes/${r.slug}`)
    if (recipe) return recipe.dateModified
    const guide = data.guides.find((g) => route === `/guides/${g.slug}`)
    if (guide) return guide.dateModified
    const post = (data.posts || []).find((p) => route === `/blog/${p.slug}`)
    if (post) return post.dateModified
    return today
  }
  // /search is a tool page (noindex) — keep it out of the sitemap.
  const urls = routes
    .filter((r) => r !== '/search')
    .map((r) => `  <url><loc>${SITE_URL}${r}</loc><lastmod>${lastmodFor(r)}</lastmod></url>`)
    .join('\n')
  writeFileSync(
    join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  )
  console.log('wrote sitemap.xml')
}

function writeRobots() {
  writeFileSync(
    join(dist, 'robots.txt'),
    `# The Recipe Seeker — AI crawlers welcome (see README §3.3)\nUser-agent: *\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\nUser-agent: CCBot\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
  )
  console.log('wrote robots.txt')
}

function writeLlmsTxt() {
  const lines = [
    `# ${data.site.name}`,
    '',
    `> ${data.site.tagline}`,
    '',
    '## Recipes',
    '',
    ...data.recipes.map((r) => `- [${r.title}](${SITE_URL}/recipes/${r.slug}): ${r.description}`),
    '',
    '## Nutrients',
    '',
    ...data.nutrients.map((n) => `- [${n.name}](${SITE_URL}/nutrients/${n.slug || n.key}): ${n.whatItDoes}`),
    '',
    '## Guides',
    '',
    ...data.guides.map((g) => `- [${g.title}](${SITE_URL}/guides/${g.slug}): ${g.description}`),
    '',
    '## Products',
    '',
    `- [Fibermax Reset: 14-Day Fiber-Rich Meal Plan + Recipes & Grocery Lists](${SITE_URL}/fibermax-reset): A gentle 14-day fiber habit guide ($17 USD, instant PDF download) — 14-day meal map, 18 recipes, 2 grocery lists, 2 prep guides, daily trackers. General nutrition education, not medical advice.`,
    '',
    '## Blog',
    '',
    `- [Blog index](${SITE_URL}/blog): Nutrition-first food writing from Emily Carter.`,
    ...(data.posts || []).map((p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}): ${p.description}`),
    '',
  ]
  writeFileSync(join(dist, 'llms.txt'), lines.join('\n'))
  console.log('wrote llms.txt')
}

function writeLlmsFullTxt() {
  const today = new Date().toISOString().slice(0, 10)
  const full = `# ${data.site.name} — full content index

> ${data.site.tagline}
> Generated ${today}. Medical disclaimer: general information only, not medical advice.

## Recipes

${data.recipes
  .map(
    (r) => `### ${r.title}
URL: ${SITE_URL}/recipes/${r.slug}/
${r.description}
Key nutrients: ${r.keyNutrients.map((k) => k.label).join(', ')}
Per serving: ${r.calories} kcal · ${r.servings} servings · ${r.prepMinutes} min prep / ${r.totalMinutes} min total
Nutrition (per serving, %DV): ${Object.entries(r.nutrition)
      .map(([k, v]) => `${k} ${v.amount}${v.unit} (${v.dv}%)`)
      .join(', ')}
Source: ${r.source}`,
  )
  .join('\n\n')}

## Nutrient hubs

${data.nutrients
  .map(
    (n) => `### ${n.name} (${n.key})
URL: ${SITE_URL}/nutrients/${n.slug || n.key}/
Daily value: ${n.dailyValue} · unit: ${n.unit}
${n.whatItDoes}
Deficiency note: ${n.deficiencyNote}
Top food sources: ${n.foodSources.map(([f, s, a]) => `${f} (${s}): ${a}`).join('; ')}
Recipes: ${(n.recipeSlugs || []).map((s) => `${SITE_URL}/recipes/${s}/`).join(', ')}`,
  )
  .join('\n\n')}

## Guides

${data.guides
  .map(
    (g) => `### ${g.title}
URL: ${SITE_URL}/guides/${g.slug}/
${g.description}
Lede: ${g.lede}
Sections: ${g.sections.map((s) => s.h2).join(' | ')}
Related recipes: ${(g.relatedRecipes || []).map((s) => `${SITE_URL}/recipes/${s}/`).join(', ')}`,
  )
  .join('\n\n')}

## Blog

${(data.posts || [])
  .map(
    (p) => `### ${p.title}
URL: ${SITE_URL}/blog/${p.slug}/
Category: ${p.category}
${p.description}
Lede: ${p.lede}
Sections: ${p.sections.map((s) => s.h2).join(' | ')}
Related recipes: ${(p.relatedRecipes || []).map((s) => `${SITE_URL}/recipes/${s}/`).join(', ')}`,
  )
  .join('\n\n')}
`
  writeFileSync(join(dist, 'llms-full.txt'), full)
  console.log('wrote llms-full.txt')
}

main().catch((err) => {
  console.error(err)
  // Keep dist-ssr around on failure for debugging.
  if (existsSync(distSsr)) console.error(`(dist-ssr/ kept for debugging)`)
  process.exit(1)
})
