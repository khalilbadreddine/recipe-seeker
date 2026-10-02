import React from 'react'
import { Link } from 'react-router-dom'

/** Accessible breadcrumb trail. Items: [{ label, to? }]; the last item is the current page. */
export default function Breadcrumbs({ items, className = 'mb-6' }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink/55">
        {items.map((item, i) => (
          <li key={item.label} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <span aria-hidden="true" className="text-ink/30">/</span>}
            {item.to && i < items.length - 1 ? (
              <Link to={item.to} className="hover:text-ink hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate font-medium text-ink/80">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
