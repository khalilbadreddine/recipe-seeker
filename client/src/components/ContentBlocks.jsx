import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Paragraph/list text with inline links:
 *   [Label](recipe:some-slug) → /recipes/some-slug
 *   [Label](post:some-slug)   → /blog/some-slug
 */
export function RichText({ text }) {
  const parts = text.split(/(\[[^\]]+\]\((?:recipe|post):[a-z0-9-]+\))/g)
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[([^\]]+)\]\((recipe|post):([a-z0-9-]+)\)$/)
        if (!m) return <React.Fragment key={i}>{part}</React.Fragment>
        const [, label, kind, slug] = m
        const to = kind === 'recipe' ? `/recipes/${slug}` : `/blog/${slug}`
        return (
          <Link key={i} to={to} className="font-semibold text-ink underline decoration-zest decoration-[3px] underline-offset-2 hover:decoration-leaf">
            {label}
          </Link>
        )
      })}
    </>
  )
}

/** Data table that stacks into cards on phones (no horizontal scroll). */
export function SectionTable({ table }) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-card">
      <ul className="divide-y divide-line sm:hidden">
        {table.rows.map((row, i) => (
          <li key={i} className="px-5 py-4">
            <p className="font-semibold text-ink">{row[0]}</p>
            <dl className="mt-1.5 space-y-1 text-sm">
              {row.slice(1).map((cell, j) => (
                <div key={j} className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-ink/55">{table.headers[j + 1]}</dt>
                  <dd className="text-right font-medium text-ink/85">{cell}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden sm:block">
        <table className="w-full text-left text-[15px]">
          <thead>
            <tr className="bg-ink text-paper">
              {table.headers.map((h) => (
                <th key={h} scope="col" className="px-5 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {table.rows.map((row, i) => (
              <tr key={i} className="text-ink/80 even:bg-paper/60">
                {row.map((cell, j) => (
                  <td key={j} className={`px-5 py-3 ${j === 0 ? 'font-semibold text-ink' : ''}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Article sections (h2 + paragraphs + optional list/table), shared by guides and blog posts. */
export function ArticleSections({ sections, idPrefix }) {
  return sections.map((section, i) => (
    <section key={i} className="mt-12 scroll-mt-28" id={`${idPrefix}-${i + 1}`} aria-labelledby={`${idPrefix}-h2-${i}`}>
      <h2 id={`${idPrefix}-h2-${i}`} className="font-display text-2xl font-bold text-ink sm:text-3xl">
        {section.h2}
      </h2>
      <div className="prose-body">
        {section.paragraphs.map((p, j) => (
          <p key={j}><RichText text={p} /></p>
        ))}
        {section.list && section.list.length > 0 && (
          <ul>
            {section.list.map((item, j) => (
              <li key={j}><RichText text={item} /></li>
            ))}
          </ul>
        )}
      </div>
      {section.table && <SectionTable table={section.table} />}
    </section>
  ))
}

/** Sticky "On this page" list for long articles (desktop sidebar). */
export function TableOfContents({ sections, idPrefix }) {
  return (
    <nav aria-label="On this page" className="rounded-3xl border border-line bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/50">On this page</p>
      <ol className="mt-3 space-y-2 text-sm">
        {sections.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-display font-bold text-leaf">{String(i + 1).padStart(2, '0')}</span>
            <a href={`#${idPrefix}-${i + 1}`} className="text-ink/75 hover:text-ink hover:underline">
              {s.h2}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** Uppercase eyebrow + display heading + optional intro, used by every section. */
export function SectionHeading({ eyebrow, title, intro, id, align = 'left', as: H = 'h2', action }) {
  return (
    <div className={`flex flex-col gap-4 [&>*]:min-w-0 sm:flex-row sm:items-end sm:justify-between ${align === 'center' ? 'text-center sm:flex-col sm:items-center' : ''}`}>
      <div className={align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] text-leaf-dark">{eyebrow}</p>}
        <H id={id} className="mt-2 font-display text-3xl font-extrabold leading-[1.08] text-ink sm:text-4xl">
          {title}
        </H>
        {intro && <p className="mt-3 text-lg leading-relaxed text-ink/65">{intro}</p>}
      </div>
      {action}
    </div>
  )
}
