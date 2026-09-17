import React from 'react'
import { formatAmount } from '../data/site'

/** Display order + labels for the nutrition table (per serving). */
const ROWS = [
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
  ['iron', 'Iron'],
  ['calcium', 'Calcium'],
  ['magnesium', 'Magnesium'],
  ['potassium', 'Potassium'],
  ['vitaminC', 'Vitamin C'],
  ['vitaminD', 'Vitamin D'],
  ['vitaminA', 'Vitamin A'],
  ['vitaminB12', 'Vitamin B12'],
  ['folate', 'Folate'],
  ['zinc', 'Zinc'],
  ['omega3', 'Omega-3'],
]

/**
 * Nutrition facts table with % Daily Value bars (mockup style).
 * Only nutrients present in the data are rendered; %DV bars clamp at 100%.
 */
export default function NutritionTable({ nutrition, servings }) {
  const rows = ROWS.filter(([key]) => nutrition[key]).map(([key, label]) => ({
    label,
    ...nutrition[key],
  }))

  return (
    <div className="overflow-hidden rounded-2xl border border-forest-line bg-cream-card">
      <div className="flex items-center justify-between border-b border-forest-line px-5 py-4">
        <h2 className="font-display text-2xl font-semibold text-forest">
          Nutrition Facts <span className="text-base font-normal text-forest/75">(per serving)</span>
        </h2>
        <span className="text-sm font-medium text-forest/75">Daily Value %</span>
      </div>
      <ul className="divide-y divide-forest/10 px-5">
        {rows.map((row) => {
          const pct = row.dv != null ? Math.min(100, Math.round(row.dv)) : null
          return (
            <li key={row.label} className="flex items-center gap-3 py-3 sm:gap-4">
              <span className="flex-1 text-[15px] text-forest/90">
                <span className="font-medium">{row.label}</span>{' '}
                <span className="text-forest/80">{formatAmount(row.amount, row.unit)}</span>
              </span>
              {pct != null ? (
                <>
                  <div
                    className="h-2.5 w-28 shrink-0 overflow-hidden rounded-full bg-cream-dark sm:w-44"
                    role="img"
                    aria-label={`${row.label}: ${pct}% of daily value`}
                  >
                    <div className="h-full rounded-full bg-ember" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm font-semibold text-forest">
                    {pct}%
                  </span>
                </>
              ) : (
                <span className="w-10 shrink-0 text-right text-sm text-forest/75">n/a</span>
              )}
            </li>
          )
        })}
      </ul>
      <p className="border-t border-forest-line px-5 py-3 text-xs text-forest/75">
        *Percent Daily Values are based on a 2000 calorie diet.
        {servings ? ` Values are per serving (recipe makes ${servings}).` : ''}
      </p>
    </div>
  )
}
