import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import Breadcrumbs from '../components/Breadcrumbs'
import Icon from '../components/Icon'
import Reveal from '../components/Reveal'
import ResponsiveImage from '../components/ResponsiveImage'
import { useShoppingList } from '../context/ShoppingListContext'
import { absUrl, getRecipe } from '../data/site'

function listAsText(lists) {
  return lists
    .map((l) => `${l.title} (${l.servings} servings)\n${l.items.filter((i) => !i.checked).map((i) => `☐ ${i.amount} ${i.item}`.trim()).join('\n')}`)
    .join('\n\n')
}

/**
 * /shopping-list: ingredients added from recipe pages, grouped by recipe,
 * with check-off, copy and share. Tool page: noindex, kept out of the sitemap.
 */
export default function ShoppingListPage() {
  const { lists, ready, count, toggleItem, removeRecipe, clearChecked, clearAll } = useShoppingList()
  const [note, setNote] = useState('')
  const hasChecked = lists.some((l) => l.items.some((i) => i.checked))

  const flash = (msg) => {
    setNote(msg)
    setTimeout(() => setNote(''), 2500)
  }

  const share = async () => {
    const text = `Shopping list from The Recipe Seeker\n\n${listAsText(lists)}`
    try {
      if (navigator.share) await navigator.share({ title: 'Shopping list', text })
      else {
        await navigator.clipboard.writeText(text)
        flash('List copied to clipboard')
      }
    } catch {
      /* share sheet dismissed */
    }
  }

  return (
    <>
      <Seo
        title="Shopping list | The Recipe Seeker"
        description="Your shopping list, built from the recipes you plan to cook."
        canonical={absUrl('/shopping-list')}
        noindex
      />
      <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 sm:pt-6">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shopping list' }]} />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Reveal as="h1" immediate variant="up" className="font-display text-5xl font-extrabold leading-[1.02] text-ink sm:text-6xl">
              Shopping list
            </Reveal>
            <Reveal as="p" immediate variant="up" delay={60} className="mt-3 text-lg text-ink/65">
              {ready && lists.length
                ? `${count} item${count === 1 ? '' : 's'} left from ${lists.length} recipe${lists.length === 1 ? '' : 's'}. Tap to tick things off.`
                : 'Add ingredients from any recipe and shop from one list.'}
            </Reveal>
          </div>
          {ready && lists.length > 0 && (
            <div className="no-print flex flex-wrap gap-2">
              <button type="button" onClick={share} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-paper hover:bg-leaf-dark">
                <Icon name="copy" className="h-4 w-4" /> Share list
              </button>
              {hasChecked && (
                <button type="button" onClick={clearChecked} className="inline-flex min-h-[44px] items-center rounded-full border border-line bg-card px-5 text-sm font-semibold text-ink hover:border-ink/30">
                  Remove ticked
                </button>
              )}
            </div>
          )}
        </div>
        {note && (
          <p role="status" className="mt-4 inline-flex rounded-full bg-zest px-4 py-2 text-sm font-semibold text-ink">{note}</p>
        )}

        <div className="mt-8">
          {!ready ? (
            <p className="text-ink/60">Loading your list…</p>
          ) : lists.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-line bg-card px-6 py-14 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zest text-ink">
                <Icon name="list" className="h-7 w-7" />
              </span>
              <p className="mt-5 font-display text-2xl font-bold text-ink">Your list is empty</p>
              <p className="mx-auto mt-2 max-w-sm text-ink/60">
                Open a recipe and tap “Add to shopping list”. Amounts follow the servings you choose.
              </p>
              <Link to="/recipes" className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-ink px-6 font-semibold text-paper hover:bg-leaf-dark">
                Browse recipes <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {lists.map((l) => {
                const r = getRecipe(l.slug)
                const left = l.items.filter((i) => !i.checked).length
                return (
                  <section key={l.slug} className="rounded-3xl border border-line bg-card p-5 sm:p-6" aria-labelledby={`list-${l.slug}`}>
                    <div className="flex items-center gap-4">
                      {r && <ResponsiveImage src={r.image} alt="" width={112} height={112} sizes="56px" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />}
                      <div className="min-w-0 flex-1">
                        <h2 id={`list-${l.slug}`} className="truncate font-display text-xl font-bold text-ink">
                          <Link to={`/recipes/${l.slug}`} className="hover:text-leaf-dark">{l.title}</Link>
                        </h2>
                        <p className="text-sm text-ink/55">
                          {l.servings} servings · {left === 0 ? 'all done' : `${left} to buy`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRecipe(l.slug)}
                        aria-label={`Remove ${l.title} from the list`}
                        className="no-print inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink/50 hover:bg-mist hover:text-ink"
                      >
                        <Icon name="close" className="h-5 w-5" />
                      </button>
                    </div>
                    <ul className="mt-4 grid gap-1 sm:grid-cols-2">
                      {l.items.map((it, i) => (
                        <li key={i}>
                          <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-mist">
                            <input
                              type="checkbox"
                              checked={it.checked}
                              onChange={() => toggleItem(l.slug, i)}
                              className="mt-0.5 h-5 w-5 shrink-0 accent-[#1F7A4A]"
                            />
                            <span className={`text-[15px] leading-snug ${it.checked ? 'text-ink/35 line-through' : 'text-ink/85'}`}>
                              <strong className="font-semibold">{it.amount}</strong> {it.item}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
              <div className="no-print flex justify-end">
                <button type="button" onClick={clearAll} className="text-sm font-semibold text-ink/55 underline underline-offset-2 hover:text-tomato-dark">
                  Clear the whole list
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
