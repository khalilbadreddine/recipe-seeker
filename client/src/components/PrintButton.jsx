import React from 'react'

/** Feather-style printer icon, inline SVG (no emoji). */
function PrinterIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}

/**
 * PrintButton - on-brand tomato-orange CTA that triggers the browser's
 * print dialog. Hidden from the printed page itself (`print:hidden`).
 *
 * Placed by the coordinator next to the other recipe actions.
 */
export default function PrintButton({ className = '', label = 'Print recipe' }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`inline-flex items-center gap-2 rounded-full bg-ember-dark px-6 py-3 font-semibold text-white shadow-sm transition hover:shadow-md print:hidden ${className}`}
    >
      <PrinterIcon />
      {label}
    </button>
  )
}
