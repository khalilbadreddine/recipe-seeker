import React from 'react'
import { formatAmount } from '../data/site'
import { NUTRIENT_META } from '../data/nutrientMeta'

/** Display order + labels for the nutrition table (per serving). */
const MACROS = [
  ['calories', 'Calories'],
  ['protein', 'Protein'],
  ['carbs', 'Total Carbohydrate'],
  ['fiber', 'Dietary Fiber'],
  ['sugar', 'Total Sugars'],
  ['fat', 'Total Fat'],
  ['saturatedFat', 'Saturated Fat'],
  ['transFat', 'Trans Fat'],
  ['cholesterol', 'Cholesterol'],
  ['sodium', 'Sodium'],
]
const MICROS = [
  ['iron', 'Iron'],
  ['calcium', 'Calcium'],
  ['magnesium', 'Magnesium'],
  ['potassium', 'Potassium'],
  ['vitaminC', 'Vitamin C'],
  ['vitaminD', 'Vitamin D'],
  ['vitaminA', 'Vitamin A'],
  ['vitaminB12', 'Vitamin B12'],
  ['b12', 'Vitamin B12'],
  ['folate', 'Folate'],
  ['zinc', 'Zinc'],
  ['omega3', 'Omega-3'],
]

function Row({ k, label, data }) {
  const pct = data.dv != null ? Math.round(data.dv) : null
  const color = NUTRIENT_META[k]?.color || '#16201B'
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 py-3 sm:grid-cols-[1fr_8rem_3rem]">
      <span className="text-[15px]">
        <span className="font-medium text-ink">{label}</span>{' '}
        <span className="text-ink/60">{formatAmount(data.amount, data.unit)}</span>
      </span>
      {pct != null ? (
        <>
          <span className="order-last col-span-2 h-1.5 overflow-hidden rounded-full bg-mist sm:order-none sm:col-span-1" role="img" aria-label={`${label}: ${pct}% of daily value`}>
            <span className="block h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
          </span>
          <span className="text-right text-sm font-bold tabular-nums text-ink">{pct}%</span>
        </>
      ) : (
        <span className="text-right text-sm text-ink/50 sm:col-span-2">n/a</span>
      )}
    </li>
  )
}

/**
 * Nutrition facts with % Daily Value bars, split into macros and
 * vitamins & minerals. Only nutrients present in the data are rendered.
 */
export default function NutritionTable({ nutrition, servings }) {
  const macros = MACROS.filter(([k]) => nutrition[k])
  const seen = new Set()
  const micros = MICROS.filter(([k, label]) => {
    if (!nutrition[k] || seen.has(label)) return false
    seen.add(label)
    return true
  })

  return (
    <div className="rounded-3xl border border-line bg-card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4 border-b-4 border-ink pb-3">
        <h2 className="font-display text-2xl font-bold text-ink">Nutrition facts</h2>
        <span className="text-sm text-ink/60">per serving · % DV</span>
      </div>
      <ul className="divide-y divide-line">
        {macros.map(([k, label]) => (
          <Row key={k} k={k} label={label} data={nutrition[k]} />
        ))}
      </ul>
      {micros.length > 0 && (
        <>
          <p className="mt-4 border-t-2 border-ink pt-3 text-xs font-bold uppercase tracking-[0.16em] text-ink/60">
            Vitamins &amp; minerals
          </p>
          <ul className="divide-y divide-line">
            {micros.map(([k, label]) => (
              <Row key={k} k={k} label={label} data={nutrition[k]} />
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink/55">
        *Percent Daily Values are based on a 2,000 calorie diet.
        {servings ? ` Values are per serving (recipe makes ${servings}).` : ''}
      </p>
    </div>
  )
}
