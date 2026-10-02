import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'rs-list-v1'

/**
 * Shopping list, grouped by recipe: [{ slug, title, servings, items: [{ amount, item, checked }] }].
 * Stored on this device (localStorage) and kept in sync across open tabs.
 * Adding a recipe that's already on the list replaces it (e.g. new servings).
 */
const ShoppingListContext = createContext({
  lists: [],
  ready: false,
  count: 0,
  has: () => false,
  addRecipe: () => {},
  removeRecipe: () => {},
  toggleItem: () => {},
  clearChecked: () => {},
  clearAll: () => {},
})

function readLocal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((l) => l && typeof l.slug === 'string' && Array.isArray(l.items)) : []
  } catch {
    return []
  }
}

function writeLocal(lists) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists))
  } catch {
    /* storage unavailable: list works for this page view */
  }
}

export function ShoppingListProvider({ children }) {
  const [lists, setLists] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setLists(readLocal())
    setReady(true)
    const onStorage = (e) => e.key === STORAGE_KEY && setLists(readLocal())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const update = useCallback((fn) => {
    setLists((prev) => {
      const next = fn(prev)
      writeLocal(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      lists,
      ready,
      count: lists.reduce((n, l) => n + l.items.filter((i) => !i.checked).length, 0),
      has: (slug) => lists.some((l) => l.slug === slug),
      addRecipe: ({ slug, title, servings, items }) =>
        update((prev) => [
          { slug, title, servings, items: items.map((i) => ({ amount: i.amount, item: i.item, checked: false })) },
          ...prev.filter((l) => l.slug !== slug),
        ]),
      removeRecipe: (slug) => update((prev) => prev.filter((l) => l.slug !== slug)),
      toggleItem: (slug, index) =>
        update((prev) =>
          prev.map((l) => (l.slug === slug ? { ...l, items: l.items.map((it, i) => (i === index ? { ...it, checked: !it.checked } : it)) } : l)),
        ),
      clearChecked: () =>
        update((prev) => prev.map((l) => ({ ...l, items: l.items.filter((i) => !i.checked) })).filter((l) => l.items.length)),
      clearAll: () => update(() => []),
    }),
    [lists, ready, update],
  )

  return <ShoppingListContext.Provider value={value}>{children}</ShoppingListContext.Provider>
}

export const useShoppingList = () => useContext(ShoppingListContext)
