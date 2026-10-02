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
        <p className="font-display text-[7rem] font-extrabold leading-none text-ink sm:text-[10rem]">
          4<span className="text-leaf">0</span>4
        </p>
        <h1 className="mt-4 font-display text-4xl font-extrabold text-ink">This page went missing</h1>
        <p className="mt-4 text-lg text-ink/65">
          The page you’re looking for doesn’t exist. But plenty of nourishing recipes do.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link to="/" className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-ink px-6 font-semibold text-paper hover:bg-leaf-dark">
            Back home
          </Link>
          <Link to="/recipes" className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-line bg-card px-6 font-semibold text-ink hover:border-ink/30">
            Browse recipes
          </Link>
        </div>
      </div>
    </>
  )
}
