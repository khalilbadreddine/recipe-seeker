import React from 'react'
import Icon from './Icon'

/** Triggers the browser's print dialog. Hidden from the printed page itself. */
export default function PrintButton({ className = '', label = 'Print' }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`no-print inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-card px-5 text-sm font-semibold text-ink hover:border-ink/30 print:hidden ${className}`}
    >
      <Icon name="print" className="h-5 w-5" />
      {label}
    </button>
  )
}
