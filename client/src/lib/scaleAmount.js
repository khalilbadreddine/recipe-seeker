/**
 * Scale an ingredient amount string ("1 1/2 tsp", "1/4 cup (80 g)",
 * "4 fillets (about 120 g each)") by a factor. Every quantity is scaled,
 * except per-item sizes ("… each"), where only the first count changes.
 * Metric amounts round to sensible whole numbers; spoons and cups round
 * to kitchen fractions. Non-numeric amounts ("optional", "to taste") pass through.
 */

const UNICODE_FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 }
const NICE_FRACTIONS = [
  [0, ''],
  [0.125, '⅛'],
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.5, '½'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
  [1, ''],
]

// whole + fraction ("1 1/2"), fraction ("1/4"), unicode ("1½", "½"), decimal/int ("1.25", "320")
const QTY_RE = /(\d+\s+\d+\/\d+|\d+\/\d+|\d*[½¼¾⅓⅔⅛]|\d+(?:\.\d+)?)/g

function parseQty(s) {
  s = s.trim()
  const uni = s.match(/^(\d*)([½¼¾⅓⅔⅛])$/)
  if (uni) return (uni[1] ? Number(uni[1]) : 0) + UNICODE_FRACTIONS[uni[2]]
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const frac = s.match(/^(\d+)\/(\d+)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])
  return Number(s)
}

function formatFraction(n) {
  const whole = Math.floor(n)
  const rest = n - whole
  let best = NICE_FRACTIONS[0]
  for (const f of NICE_FRACTIONS) if (Math.abs(f[0] - rest) < Math.abs(best[0] - rest)) best = f
  const w = best[0] === 1 ? whole + 1 : whole
  if (w === 0 && !best[1]) return '⅛'
  return `${w || ''}${best[1]}` || '0'
}

function formatMetric(n) {
  if (n >= 100) return String(Math.round(n / 5) * 5)
  if (n >= 10) return String(Math.round(n))
  return String(Math.round(n * 10) / 10)
}

export function scaleAmount(amount, factor) {
  if (!amount || factor === 1) return amount
  const perItem = /\beach\b/i.test(amount)
  let index = 0
  return amount.replace(QTY_RE, (match, _g, offset) => {
    const i = index++
    if (perItem && i > 0) return match
    const value = parseQty(match) * factor
    const after = amount.slice(offset + match.length).trim().toLowerCase()
    const metric = /^(g|kg|ml|l|mg|oz|lb)\b/.test(after)
    const spoon = /^(tsp|tbsp|cup|cups|teaspoons?|tablespoons?)\b/.test(after)
    if (metric) return formatMetric(value)
    if (spoon) return formatFraction(value)
    return Number.isInteger(value) ? String(value) : formatFraction(value)
  })
}
