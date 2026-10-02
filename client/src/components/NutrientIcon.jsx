import React from 'react'

const NUTRIENT_ICONS = {
  protein: 'M12 3v10m0 0c-3 0-5-2-5-5m5 5c3 0 5-2 5-5M5 21h14',
  iron: 'M12 3c3 4 6 7 6 11a6 6 0 11-12 0c0-4 3-7 6-11z',
  fiber: 'M12 21V8m0 0c0-4 3-6 7-6 0 4-3 6-7 6zm0 5c0-4-3-6-7-6 0 4 3 6 7 6z',
  'vitamin-c': 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 5v16M4.5 10h15M6 16.5h12',
  calcium: 'M8 3h8v4l3 4v9a2 2 0 01-2 2H7a2 2 0 01-2-2v-9l3-4V3z',
  magnesium: 'M4 14c2-1 3-3 3-6 3 0 5 2 6 5 2-1 4-1 7 1-3 1-5 0-7 1-1 2-3 3-6 3-1-2-2-3-3-4z',
  'omega-3': 'M3 12c3-5 9-6 13-2l4-3v10l-4-3c-4 4-10 3-13-2zM8 11h.01',
  'vitamin-d': 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  b12: 'M7 3h10M9 3v6l-4 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-4-9V3M7 14h10',
  zinc: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 3v18M4 7.5l16 9M20 7.5l-16 9',
  folate: 'M12 21c-5 0-8-4-8-9 4 0 7 2 8 5 1-3 4-5 8-5 0 5-3 9-8 9zM12 17V3m0 4c-2-1-3-3-3-4m3 4c2-1 3-3 3-4',
  potassium: 'M5 15c4 5 12 4 15-5 1-3 0-5-1-6-1 4-4 8-9 9-2 .5-4 .8-5 2z',
}

/** Small line-icon for a nutrient hub. iconKey matches the nutrient slug (or key). */
export default function NutrientIcon({ iconKey, className = 'h-4 w-4' }) {
  const key = {
    vitaminC: 'vitamin-c',
    vitaminD: 'vitamin-d',
    omega3: 'omega-3',
  }[iconKey] || iconKey
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={NUTRIENT_ICONS[key] || NUTRIENT_ICONS.protein} />
    </svg>
  )
}
