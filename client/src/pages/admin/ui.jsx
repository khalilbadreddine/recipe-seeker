import React, { useCallback, useState } from 'react'

/**
 * Shared brand UI kit for the admin dashboard.
 *
 * Palette lock: forest / cream / ember only (no purple, no blue, no generic
 * gradients). Fraunces for display headings, Inter for body.
 * Corner-radius scale: cards 16px · buttons 12px · inputs 10px · pills full.
 * Touch targets: interactive elements are min 44px (min-h-11).
 */

export const INK = '#1c2b23'
export const MUTED = '#6b5f4d'

/* ---------- time helpers ---------- */
export function ago(iso) {
  if (!iso) return '—'
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 0) return 'just now'
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
export function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

/* ---------- copy-to-clipboard with feedback ---------- */
export function useCopy() {
  const [copied, setCopied] = useState('')
  const copy = useCallback(async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(''), 2200)
      return true
    } catch {
      return false
    }
  }, [])
  return { copied, copy }
}

/* ---------- layout primitives ---------- */
export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-forest-line bg-cream-card p-4 ${className}`}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, className = '' }) {
  return (
    <h2 className={`font-display mt-7 mb-3 text-xl font-semibold text-forest ${className}`}>
      {children}
    </h2>
  )
}

/* ---------- pills & chips (brand colors only) ---------- */
const STATUS_STYLE = {
  new: 'bg-forest-soft text-forest',
  drafted: 'bg-cream-dark text-forest-dark',
  pending_review: 'bg-ember-soft text-ember-dark',
  approved: 'bg-forest-soft text-forest',
  rejected: 'bg-cream-dark text-[#6b5f4d]',
  published: 'bg-forest text-white',
}
export function StatusPill({ status }) {
  const cls = STATUS_STYLE[status] || 'bg-cream-dark text-[#6b5f4d]'
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${cls}`}>
      {(status || '').replace(/_/g, ' ')}
    </span>
  )
}

export function TabBadge({ count }) {
  if (!count) return null
  return (
    <span className="ml-1.5 inline-block rounded-full bg-ember-dark px-2 py-0.5 text-[11px] font-bold text-white">
      {count}
    </span>
  )
}

const SCRIPT_STYLE = {
  miner: 'bg-forest-soft text-forest',
  generator: 'bg-ember-soft text-ember-dark',
  publisher: 'bg-forest text-white',
  scheduler: 'bg-cream-dark text-forest-dark',
  you: 'bg-cream-dark text-forest-dark',
}
const SCRIPT_LABEL = { miner: 'Miner', generator: 'Generator', publisher: 'Publisher', scheduler: 'Scheduler' }
export function ScriptChip({ script }) {
  const cls = SCRIPT_STYLE[script] || SCRIPT_STYLE.you
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase whitespace-nowrap ${cls}`}>
      {SCRIPT_LABEL[script] || script}
    </span>
  )
}

export function LevelPill({ level }) {
  const l = level || 'info'
  const map = {
    info: 'bg-forest-soft text-forest',
    warn: 'bg-ember-soft text-ember-dark',
    error: 'bg-ember-dark text-white',
  }
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${map[l] || map.info}`}>
      {l}
    </span>
  )
}

/* ---------- buttons (WCAG AA: white on forest 10.9:1, on ember-dark 5.3:1) ---------- */
const BTN_BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-bold cursor-pointer select-none min-h-11 px-5 text-[15px] transition active:scale-[0.98]'

export function PrimaryBtn({ children, className = '', ...rest }) {
  return (
    <button
      className={`${BTN_BASE} bg-forest text-white hover:bg-forest-dark disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function DangerBtn({ children, className = '', ...rest }) {
  return (
    <button
      className={`${BTN_BASE} bg-ember-dark text-white hover:bg-[#a83a1a] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function GhostBtn({ children, active, className = '', ...rest }) {
  return (
    <button
      className={`${BTN_BASE} border text-[14px] px-4 ${
        active
          ? 'border-forest bg-forest text-white'
          : 'border-forest-line bg-cream-card text-forest hover:border-forest'
      } disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ---------- form ---------- */
export const inputCls =
  'w-full rounded-[10px] border border-[#d8cfc2] bg-white px-3 py-2.5 text-[15px] text-[#1c2b23] placeholder:text-[#a89a83] focus:border-forest focus:outline-none'
export const labelCls =
  'mt-3 mb-1 block text-[11px] font-extrabold tracking-wide text-[#6b5f4d] uppercase'

/* ---------- stat ---------- */
export function StatCard({ value, label, accent }) {
  return (
    <Card className="!p-3 text-center">
      <div className="font-display text-[26px] font-bold" style={{ color: accent || '#1e4633' }}>
        {value}
      </div>
      <div className="mt-1 text-xs leading-snug text-[#6b5f4d]">{label}</div>
    </Card>
  )
}

/* ---------- empty state that tells him what to do next ---------- */
export function EmptyState({ icon = '📭', title, text, actionLabel, onAction, actionDoneLabel }) {
  const [done, setDone] = useState(false)
  return (
    <Card className="my-4 flex flex-col items-center px-6 py-10 text-center">
      <div className="font-display text-4xl">{icon}</div>
      <div className="font-display mt-3 text-lg font-semibold text-forest">{title}</div>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[#6b5f4d]">{text}</p>
      {actionLabel && (
        <div className="mt-4">
          <GhostBtn
            onClick={async () => {
              await onAction()
              if (actionDoneLabel) {
                setDone(true)
                setTimeout(() => setDone(false), 2200)
              }
            }}
          >
            {done && actionDoneLabel ? actionDoneLabel : actionLabel}
          </GhostBtn>
        </div>
      )}
    </Card>
  )
}
