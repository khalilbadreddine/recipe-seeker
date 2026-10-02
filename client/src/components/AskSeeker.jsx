import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'
import ResponsiveImage from './ResponsiveImage'
import { recipes, nutrients, getRecipe, formatAmount } from '../data/site'
import { nutrientMeta } from '../data/nutrientMeta'
import { matchConversation, basicReply, parseIntent } from '../lib/recipeMatch.mjs'

const STORAGE_KEY = 'rs-chat-v1'
const MAX_CHARS = 500

const STARTERS = [
  'High-protein vegetarian dinner under 30 minutes',
  'What should I eat for more iron?',
  'A fiber-rich breakfast',
  'Dairy-free dinner with omega-3',
]

const WELCOME = {
  role: 'assistant',
  intro: true,
  content:
    'Hi, I’m Seeker. Tell me what you need, like a nutrient, a diet, a meal or what’s in your fridge, and I’ll find recipes from our collection with the real numbers.',
}

function loadChat() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) && parsed.length ? parsed : null
  } catch {
    return null
  }
}

function saveChat(messages) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)))
  } catch {
    /* storage unavailable: chat still works for this page view */
  }
}

/** Plain-text reply → paragraphs and "- " bullet lists. */
function ReplyText({ text }) {
  const blocks = []
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const bullet = line.match(/^[-*•]\s+(.*)$/)
    const last = blocks[blocks.length - 1]
    if (bullet) {
      if (last?.type === 'ul') last.items.push(bullet[1])
      else blocks.push({ type: 'ul', items: [bullet[1]] })
    } else blocks.push({ type: 'p', text: line })
  }
  return blocks.map((b, i) =>
    b.type === 'ul' ? (
      <ul key={i} className="mt-2 list-disc space-y-1 pl-5 first:mt-0 marker:text-leaf">
        {b.items.map((it, j) => (
          <li key={j}>{it}</li>
        ))}
      </ul>
    ) : (
      <p key={i} className="mt-2 first:mt-0">{b.text}</p>
    ),
  )
}

function MiniRecipe({ slug, focus }) {
  const r = getRecipe(slug)
  if (!r) return null
  // Show the nutrient the visitor asked about when the recipe has it, else its headline nutrient.
  const asked = focus && r.nutrition[focus] && nutrients.find((n) => n.key === focus)
  const top = asked
    ? { key: focus, label: `${formatAmount(r.nutrition[focus].amount, r.nutrition[focus].unit)} ${asked.name}` }
    : r.keyNutrients[0]
  const key = top && (top.key || top.id)
  return (
    <Link to={`/recipes/${r.slug}`} className="group flex items-center gap-3 rounded-2xl border border-line bg-card p-2 pr-3 hover:border-ink/25 hover:shadow-[var(--shadow-card)]">
      <ResponsiveImage src={r.image} alt="" width={112} height={112} sizes="56px" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink group-hover:text-leaf-dark">{r.title}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink/60">
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <Icon name="clock" className="h-3.5 w-3.5" /> {r.totalMinutes} min
          </span>
          {top && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: nutrientMeta(key).color }} aria-hidden="true" />
              {top.label}
            </span>
          )}
          <span className="hidden whitespace-nowrap sm:inline">{formatAmount(r.calories, 'kcal')}</span>
        </span>
      </span>
      <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-ink/30" />
    </Link>
  )
}

function Typing() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2" aria-label="Seeker is typing">
      {[0, 150, 300].map((d) => (
        <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-ink/40" style={{ animationDelay: `${d}ms` }} />
      ))}
    </div>
  )
}

/**
 * "Ask Seeker": AI recipe assistant for the home page.
 * Talks to /api/chat (grounded in our recipes). If the API is unreachable
 * (local dev, outage), it answers on-device with the same recipe matcher,
 * so the panel always works. Conversation persists for the browser session.
 */
export default function AskSeeker() {
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const logRef = useRef(null)
  const inputRef = useRef(null)
  const loaded = useRef(false)

  useEffect(() => {
    const saved = loadChat()
    if (saved) setMessages(saved)
    loaded.current = true
  }, [])

  useEffect(() => {
    if (loaded.current) saveChat(messages)
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy])

  const ask = async (text) => {
    const question = text.trim().slice(0, MAX_CHARS)
    if (!question || busy) return
    const next = [...messages, { role: 'user', content: question }]
    setMessages(next)
    setInput('')
    setBusy(true)

    const history = next.filter((m) => !m.intro && !m.error).map(({ role, content }) => ({ role, content }))
    const userQs = history.filter((m) => m.role === 'user').map((m) => m.content)
    const focus = parseIntent(userQs.slice(-2).join(' ')).nutrients[0]
    let answer
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      if (res.status === 429) {
        const body = await res.json().catch(() => ({}))
        answer = { role: 'assistant', error: true, content: body.error || 'Too many questions at once. Please try again in a few minutes.' }
      } else if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      } else {
        const body = await res.json()
        answer = { role: 'assistant', content: body.reply, recipes: body.recipes || [], mode: body.mode, focus }
      }
    } catch {
      // Offline / no API (e.g. local dev): answer on-device from the same data.
      const match = matchConversation(userQs, { recipes, nutrients })
      answer = { role: 'assistant', content: basicReply(match), recipes: match.recipes.slice(0, 4).map((r) => r.slug), mode: 'basic', focus }
    }
    setMessages((m) => [...m, answer])
    setBusy(false)
    inputRef.current?.focus({ preventScroll: true })
  }

  const reset = () => {
    setMessages([WELCOME])
    setInput('')
  }

  const fresh = messages.length === 1

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-line bg-card shadow-[var(--shadow-lift)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-zest">
            <Icon name="sparkle" className="h-5 w-5" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-leaf" aria-hidden="true" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="font-display text-lg font-bold text-ink">Seeker</p>
            <p className="truncate text-xs text-ink/55">AI kitchen assistant · answers from our recipes</p>
          </div>
        </div>
        {!fresh && (
          <button type="button" onClick={reset} className="inline-flex min-h-[36px] shrink-0 items-center whitespace-nowrap rounded-full px-3 text-xs font-semibold text-ink/60 hover:bg-mist hover:text-ink">
            New chat
          </button>
        )}
      </div>

      <div ref={logRef} tabIndex={0} role="log" aria-live="polite" aria-label="Conversation with Seeker" className="h-[400px] flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:h-[440px] sm:px-5">
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[15px] leading-relaxed text-paper">{m.content}</p>
            </div>
          ) : (
            <div key={i} className="max-w-[92%]">
              <div className={`rounded-2xl rounded-bl-md px-4 py-3 text-[15px] leading-relaxed ${m.error ? 'bg-tomato-soft text-ink' : 'bg-mist text-ink/90'}`}>
                <ReplyText text={m.content} />
              </div>
              {m.recipes?.length > 0 && (
                <div className="mt-2 grid gap-2">
                  {m.recipes.map((slug) => (
                    <MiniRecipe key={slug} slug={slug} focus={m.focus} />
                  ))}
                </div>
              )}
            </div>
          ),
        )}
        {busy && <Typing />}
        {fresh && (
          <div className="flex flex-wrap gap-2 pt-1">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="min-h-[40px] rounded-full border border-line bg-paper px-3.5 text-left text-sm font-medium text-ink/80 hover:border-ink/30 hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(input)
        }}
        className="border-t border-line p-3 sm:p-4"
      >
        <label htmlFor="ask-seeker" className="sr-only">Ask Seeker a question</label>
        <div className="flex items-center gap-2 rounded-full bg-mist p-1.5 pl-4 focus-within:ring-2 focus-within:ring-leaf">
          <input
            ref={inputRef}
            id="ask-seeker"
            type="text"
            value={input}
            maxLength={MAX_CHARS}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for a recipe, a nutrient, a diet…"
            autoComplete="off"
            className="min-h-[44px] min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink/40 focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper hover:bg-leaf-dark disabled:opacity-40"
          >
            <Icon name="arrowRight" className="h-5 w-5" strokeWidth={2.4} />
          </button>
        </div>
        <p className="mt-2 px-2 text-[11px] leading-snug text-ink/45">
          AI answers can be wrong. General information only, not medical advice.
        </p>
      </form>
    </div>
  )
}
