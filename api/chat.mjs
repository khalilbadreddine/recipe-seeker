/**
 * POST /api/chat: "Ask Seeker", the recipe assistant on the home page.
 *
 * Body:     { messages: [{ role: 'user' | 'assistant', content: string }, ...] }
 * Response: { reply: string, recipes: [slug, ...], mode: 'ai' | 'basic' }
 *
 * Every answer is grounded in this site's own recipes: the question is
 * matched against recipes.json (client/src/lib/recipeMatch.mjs), and only
 * those recipes, with their real per-serving numbers, are given to the
 * model. Without any LLM key (or if every provider fails), the function
 * still answers in 'basic' mode with the matched recipes, so the chat never
 * breaks.
 *
 * Guardrails: same-origin only, best-effort rate limit per IP, capped
 * message length/history/output, and a system prompt that forbids medical
 * advice, invented recipes and invented numbers (YMYL).
 */
import { readFileSync } from 'node:fs'
import { matchConversation, recipeLine, basicReply } from '../client/src/lib/recipeMatch.mjs'
import { chatCompletion, isLlmConfigured } from './_lib/llm.mjs'
import { createRateLimiter, clientIp, sameOrigin, readJson, send } from './_lib/http.mjs'

const data = JSON.parse(readFileSync(new URL('../client/src/data/recipes.json', import.meta.url), 'utf8'))
const bySlug = new Map(data.recipes.map((r) => [r.slug, r]))

const allow = createRateLimiter({ limit: 20, windowMs: 10 * 60_000 })
const MAX_CHARS = 500
const MAX_HISTORY = 8

const RULES = `You are Seeker, the friendly kitchen assistant on The Recipe Seeker, a nutrition-first recipe website ("find recipes by what your body needs").

Rules:
- Only help with food, cooking, recipes, ingredients, nutrients in food, meal ideas and using this website. Politely decline anything else in one sentence.
- Recommend ONLY recipes from the "SITE RECIPES" list below and always call them by their exact title in double quotes. Never invent recipes.
- Use ONLY the nutrition numbers given below. Never invent or estimate numbers. If the list is empty or nothing fits, say so honestly and suggest how to rephrase.
- You are not a doctor or dietitian. Never diagnose, never suggest treatments, supplements or doses, never claim food treats, cures or prevents disease. For symptoms, deficiencies, medical conditions, pregnancy or medications, add one short line suggesting they talk to their doctor or a registered dietitian.
- Be brief and practical: 2 to 5 short sentences, or a short list using "- " bullets. Plain text only, no headings, no tables, no links.
- Mention why a recipe fits (time, key nutrient amount per serving, diet).`

function systemPrompt(match) {
  const focus = match.intent.nutrients
  const lines = match.recipes.map((r) => recipeLine(r, focus)).join('\n')
  const facts = match.hubs
    .map((h) => `- ${h.name}: daily value ${h.dailyValue}. ${String(h.whatItDoes).split('. ')[0]}.`)
    .join('\n')
  return `${RULES}

SITE RECIPES that match the latest question (best first):
${lines || '(none matched)'}
${facts ? `\nNUTRIENT FACTS from this site:\n${facts}\n` : ''}${match.timeRelaxed ? `\nNote: no recipe fits the requested time, these are the closest.` : ''}${
    match.mealRelaxed ? `\nNote: no recipe matches the requested meal type, these are the closest.` : ''
  }`
}

/** Recipes the reply actually names, in order; falls back to the top matches. */
function referencedSlugs(reply, candidates) {
  const text = reply.toLowerCase()
  const named = candidates
    .map((r) => ({ slug: r.slug, at: text.indexOf(r.title.toLowerCase()) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((x) => x.slug)
  return named.length ? named.slice(0, 4) : candidates.slice(0, 3).map((r) => r.slug)
}

function cleanMessages(raw) {
  if (!Array.isArray(raw)) return null
  const msgs = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_CHARS) }))
    .filter((m) => m.content)
    .slice(-MAX_HISTORY)
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return null
  return msgs
}

export default async function handler(req, res) {
  if (req.method === 'GET') return send(res, 200, { ok: true, ai: isLlmConfigured() })
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })
  if (!sameOrigin(req)) return send(res, 403, { error: 'forbidden' })
  if (!allow(clientIp(req))) {
    return send(res, 429, { error: 'Too many questions in a short time. Please wait a few minutes and try again.' })
  }

  let body
  try {
    body = await readJson(req)
  } catch {
    return send(res, 400, { error: 'invalid JSON' })
  }
  const messages = cleanMessages(body?.messages)
  if (!messages) return send(res, 400, { error: 'messages must end with a user message' })

  // Follow-ups ("any quicker ones?", "make it vegan") build on the previous question.
  const match = matchConversation(messages.filter((m) => m.role === 'user').map((m) => m.content), data)

  if (isLlmConfigured()) {
    try {
      const out = await chatCompletion([{ role: 'system', content: systemPrompt(match) }, ...messages], { maxTokens: 450 })
      const reply = out.text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s*/gm, '').trim()
      const recipes = match.recipes.length ? referencedSlugs(reply, match.recipes).filter((s) => bySlug.has(s)) : []
      return send(res, 200, { reply, recipes, mode: 'ai' })
    } catch (e) {
      console.error('[chat] LLM failed, answering in basic mode:', e.message)
    }
  }

  return send(res, 200, {
    reply: basicReply(match),
    recipes: match.recipes.slice(0, 4).map((r) => r.slug),
    mode: 'basic',
  })
}
