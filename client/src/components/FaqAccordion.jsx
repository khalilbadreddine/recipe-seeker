import React from 'react'

/**
 * FAQ accordion built on <details>/<summary> so every question AND answer is
 * present in the prerendered HTML (SEO/AI-citation friendly) and works with zero JS.
 */
export default function FaqAccordion({ faqs, idPrefix = 'faq' }) {
  return (
    <div className="divide-y divide-forest/10 overflow-hidden rounded-2xl border border-forest-line bg-cream-card">
      {faqs.map((faq, i) => (
        <details key={i} id={`${idPrefix}-${i + 1}`} className="faq-item group">
          <summary className="flex items-center justify-between gap-4 px-5 py-4 text-left">
            <span className="font-medium text-forest">{faq.q}</span>
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-soft text-lg font-semibold text-forest transition group-open:rotate-45 group-open:bg-ember-dark group-open:text-white"
            >
              +
            </span>
          </summary>
          <div className="px-5 pb-5 text-[15px] leading-relaxed text-forest/75">{faq.a}</div>
        </details>
      ))}
    </div>
  )
}
