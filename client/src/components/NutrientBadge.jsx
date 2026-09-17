import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Signature nutrient pill - filled forest on cards, outlined ember/forest on detail pages.
 * Links to the nutrient hub when `to` is provided.
 */
export default function NutrientBadge({ label, to, variant = 'solid' }) {
  const styles =
    variant === 'outline'
      ? 'border border-forest/40 text-forest bg-cream-card'
      : 'bg-forest text-cream'
  const className = `inline-flex items-center rounded-full px-3.5 py-2 text-sm font-semibold sm:py-1.5 ${styles}`
  if (to) {
    return (
      <Link to={to} className={`${className} transition hover:-translate-y-px hover:shadow`}>
        {label}
      </Link>
    )
  }
  return <span className={className}>{label}</span>
}
