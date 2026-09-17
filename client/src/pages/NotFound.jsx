import React from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import { absUrl } from '../data/site'

export default function NotFound() {
  return (
    <>
      <Seo
        title="Page not found | The Recipe Seeker"
        description="The page you're looking for doesn't exist."
        canonical={absUrl('/404')}
        noindex
      />
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <p className="font-display text-6xl font-semibold text-forest/20 sm:text-7xl">404</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-forest">This page went missing</h1>
        <p className="mt-4 text-lg text-forest/80">
          The page you’re looking for doesn’t exist. But plenty of nourishing recipes do.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Link to="/" className="rounded-full bg-ember-dark px-6 py-3 text-center font-semibold text-white shadow-sm transition hover:shadow-md">
            Back home
          </Link>
          <Link to="/search" className="rounded-full border border-forest/30 px-6 py-3 text-center font-semibold text-forest transition hover:bg-forest hover:text-cream">
            Search Recipes
          </Link>
        </div>
      </div>
    </>
  )
}
