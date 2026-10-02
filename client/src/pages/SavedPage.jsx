import React from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import Breadcrumbs from '../components/Breadcrumbs'
import RecipeCard from '../components/RecipeCard'
import Reveal from '../components/Reveal'
import SignInButton from '../components/SignInButton'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'
import { absUrl, getRecipe, formatAmount } from '../data/site'

/**
 * /saved: the user's saved (favorite) recipes.
 * Prerendered shell; the grid is client-rendered from localStorage or,
 * when signed in, from the Supabase `favorites` table (source of truth).
 */
export default function SavedPage() {
  const { configured, user, loading: authLoading } = useAuth()
  const { favorites, ready } = useFavorites()

  const canonical = absUrl('/saved')
  const title = 'Saved recipes | The Recipe Seeker'
  const description =
    'Your saved recipes in one place. Tap the heart on any recipe to keep it here. Sign in to sync them across devices.'

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Saved recipes',
    description,
    url: canonical,
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Saved recipes', item: canonical },
    ],
  }

  const savedRecipes = favorites.map(getRecipe).filter(Boolean)
  const showSignInCta = configured && !authLoading && !user

  // Totals across the saved collection: a quick "what's in my box" summary.
  const avg = (k) =>
    savedRecipes.length ? savedRecipes.reduce((s, r) => s + (r.nutrition[k]?.amount || 0), 0) / savedRecipes.length : 0

  return (
    <>
      <Seo title={title} description={description} canonical={canonical} />
      <JsonLd data={[webPageLd, breadcrumbLd]} />

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Saved recipes' }]} />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Reveal as="h1" immediate variant="up" className="font-display text-5xl font-extrabold leading-[1.02] text-ink sm:text-6xl">
              Your recipe box
            </Reveal>
            <Reveal as="p" immediate variant="up" delay={80} className="mt-4 text-lg leading-relaxed text-ink/65">
              Everything you’ve hearted, in one place.
              {configured && user ? ' Synced to your account, so it’s on every device.' : ' Saved on this device.'}
            </Reveal>
          </div>
          {ready && savedRecipes.length > 0 && (
            <dl className="grid grid-cols-3 gap-3 rounded-3xl border border-line bg-card p-4 text-center">
              <div>
                <dt className="text-xs font-medium text-ink/55">Saved</dt>
                <dd className="font-display text-2xl font-extrabold text-ink">{savedRecipes.length}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-ink/55">Avg protein</dt>
                <dd className="font-display text-2xl font-extrabold text-ink">{formatAmount(avg('protein'), 'g')}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-ink/55">Avg fiber</dt>
                <dd className="font-display text-2xl font-extrabold text-ink">{formatAmount(avg('fiber'), 'g')}</dd>
              </div>
            </dl>
          )}
        </div>

        {showSignInCta && (
          <Reveal variant="up" className="mt-8 flex flex-col gap-5 rounded-[2rem] bg-ink p-6 text-paper sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="font-display text-2xl font-bold">Take them anywhere</h2>
              <p className="mt-1 max-w-xl leading-relaxed text-paper/70">
                Sign in with Google to sync saved recipes and your My Day meal plans across phone, tablet and computer.
              </p>
            </div>
            <SignInButton className="shrink-0 border-transparent" />
          </Reveal>
        )}

        <div className="mt-10">
          {!ready || authLoading ? (
            <p className="text-ink/60">Loading your saved recipes…</p>
          ) : savedRecipes.length === 0 ? (
            <div className="mx-auto max-w-xl rounded-[2rem] border border-dashed border-line bg-card px-6 py-14 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tomato-soft text-tomato">
                <Icon name="heart" className="h-7 w-7" />
              </span>
              <p className="mt-5 font-display text-2xl font-bold text-ink">Nothing saved yet</p>
              <p className="mt-2 text-ink/60">Tap the heart on any recipe and it’ll wait for you here.</p>
              <Link to="/recipes" className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-ink px-6 font-semibold text-paper hover:bg-leaf-dark">
                Browse recipes <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {savedRecipes.map((r) => (
                <RecipeCard key={r.slug} recipe={r} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
