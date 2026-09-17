import React from 'react'
import { Link } from 'react-router-dom'

/** Accessible breadcrumb trail. Items: [{ label, to? }] - last item is current page (no link). */
export default function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-forest/80">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true" className="text-forest/40">/</span>}
            {item.to && i < items.length - 1 ? (
              <Link to={item.to} className="underline decoration-ember/60 underline-offset-2 hover:text-forest">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-forest font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
