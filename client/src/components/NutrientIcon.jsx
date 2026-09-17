import React from 'react'

const NUTRIENT_ICONS = {
  protein: 'M12 3v10m0 0c-3 0-5-2-5-5m5 5c3 0 5-2 5-5M5 21h14',
  iron: 'M12 3c3 4 6 7 6 11a6 6 0 11-12 0c0-4 3-7 6-11z',
  fiber: 'M12 21V8m0 0c0-4 3-6 7-6 0 4-3 6-7 6zm0 5c0-4-3-6-7-6 0 4 3 6 7 6z',
  'vitamin-c': 'M12 3v18M5 8l14 8M19 8L5 16',
  calcium: 'M8 3h8v4l3 4v9a2 2 0 01-2 2H7a2 2 0 01-2-2v-9l3-4V3z',
  magnesium: 'M4 14c2-1 3-3 3-6 3 0 5 2 6 5 2-1 4-1 7 1-3 1-5 0-7 1-1 2-3 3-6 3-1-2-2-3-3-4z',
  'omega-3': 'M6 12c2-3 4-3 6 0s4 3 6 0M4 8c2 1 4 1 6-1M14 16c2 2 4 2 6 0',
}

/** Small line-icon for a nutrient hub. iconKey matches the nutrient slug/key. */
export default function NutrientIcon({ iconKey, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={NUTRIENT_ICONS[iconKey] || NUTRIENT_ICONS.protein} />
    </svg>
  )
}
