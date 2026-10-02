import React from 'react'
import { Link } from 'react-router-dom'
import { nutrientMeta, tint } from '../data/nutrientMeta'

/**
 * Nutrient chip: color dot + label on a tint of the nutrient's color.
 * `nutrientKey` picks the color; without one it renders as a neutral chip.
 * Links to the nutrient hub when `to` is provided.
 */
export default function NutrientBadge({ label, to, nutrientKey, size = 'md' }) {
  const color = nutrientKey ? nutrientMeta(nutrientKey).color : null
  const sizing = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px]'
  const className = `inline-flex items-center gap-1.5 rounded-full font-semibold text-ink ${sizing} ${
    color ? '' : 'border border-line bg-card'
  }`
  const style = color ? { backgroundColor: tint(color, 0.13) } : undefined
  const dot = color ? (
    <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
  ) : null

  if (to) {
    return (
      <Link to={to} className={`${className} relative z-10 hover:-translate-y-px hover:shadow-sm`} style={style}>
        {dot}
        {label}
      </Link>
    )
  }
  return (
    <span className={className} style={style}>
      {dot}
      {label}
    </span>
  )
}
