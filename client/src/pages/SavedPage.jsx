import React from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import Breadcrumbs from '../components/Breadcrumbs'
import RecipeCard from '../components/RecipeCard'
import Reveal from '../components/Reveal'
import SignInButton from '../components/SignInButton'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'
import { absUrl, getRecipe } from '../data/site'

/**
 * /saved — the user's saved (favorite) recipes.
 * Prerendered shell; the grid is client-rendered from localStorage or,
 * when signed in, from the Supabase `favorites` table (source of truth).
 */
export default function SavedPage() {
  const { configured, user, loading: authLoading } = useAuth()
  const { favorites, ready } = useFavorites()

  const canonical = absUrl('/saved')
  const title = 'Saved recipes | The Recipe Seeker'
  const description =
    'Your saved recipes in one place — tap the heart on any recipe to keep it here. Sign in to sync them across devices.'

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

  return (
    <>
      <Seo title={title} description={description} canonical={canonical} />
      <JsonLd data={[webPageLd, breadcrumbLd]} />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Saved recipes' }]} />

        <Reveal as="h1" immediate variant="up" className="mt-6 font-display text-4xl font-semibold leading-tight text-forest sm:text-5xl">
          Saved recipes
        </Reveal>
        <Reveal as="p" immediate variant="fade" delay={120} className="mt-4 max-w-2xl text-lg leading-relaxed text-forest/80">
          Everything you've hearted, in one place.
          {configured && user
            ? ' Synced to your account — find them on any device.'
            : ' Saved on this device.'}
        </Reveal>

        {showSignInCta && (
          <Reveal variant="up" className="mt-8 max-w-2xl rounded-3xl border border-forest/15 bg-forest p-6 text-cream sm:p-8">
            <h2 className="font-display text-2xl font-semibold">Take them anywhere</h2>
            <p className="mt-2 leading-relaxed text-cream/80">
              Sign in with Google to sync your saved recipes — and your Build-Your-Day meal
              plans — across your phone, tablet and computer.
            </p>
            <div className="mt-5">
              <SignInButton className="border-cream/30 bg-cream text-forest hover:border-cream" />
            </div>
          </Reveal>
        )}

        <div className="mt-10">
          {!ready || authLoading ? (
            <p className="text-forest/70">Loading your saved recipes…</p>
          ) : savedRecipes.length === 0 ? (
            <div className="max-w-xl rounded-3xl border border-dashed border-forest/25 px-6 py-12 text-center">
              <p className="font-display text-xl font-semibold text-forest">Nothing saved yet</p>
              <p className="mt-2 text-forest/70">
                Tap the heart on any recipe and it'll wait for you here.
              </p>
              <Link
                to="/recipes"
                className="mt-6 inline-flex min-h-[44px] items-center rounded-full bg-ember-dark px-6 py-2.5 font-semibold text-white transition hover:shadow-md"
              >
                Browse recipes
              </Link>
            </div>
          ) : (
            <>
              {showSignInCta && (
                <p className="mb-5 text-sm font-medium text-forest/70">
                  Saved on this device ({savedRecipes.length})
                </p>
              )}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {savedRecipes.map((r) => (
                  <RecipeCard key={r.slug} recipe={r} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
