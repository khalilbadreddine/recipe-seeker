import React from 'react'

/**
 * FAQ accordion on <details>/<summary>: every question AND answer is in the
 * prerendered HTML (SEO/AI-citation friendly) and works with zero JS.
 */
export default function FaqAccordion({ faqs, idPrefix = 'faq' }) {
  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <details key={i} id={`${idPrefix}-${i + 1}`} className="faq-item group rounded-2xl border border-line bg-card open:shadow-[var(--shadow-card)]">
          <summary className="flex min-h-[56px] items-center justify-between gap-4 px-5 py-4 text-left">
            <span className="font-semibold text-ink">{faq.q}</span>
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mist text-lg font-semibold text-ink transition group-open:rotate-45 group-open:bg-zest"
            >
              +
            </span>
          </summary>
          <div className="px-5 pb-5 text-[15px] leading-relaxed text-ink/70">{faq.a}</div>
        </details>
      ))}
    </div>
  )
}
