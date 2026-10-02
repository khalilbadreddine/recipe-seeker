import React from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'

/** Promo block for the Fibermax Reset 14-day guide (paid PDF). */
export default function LeadMagnetCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6" aria-labelledby="fibermax-cta-heading">
      <div className="relative overflow-hidden rounded-[2rem] bg-leaf px-6 py-10 text-paper sm:px-12 sm:py-14">
        <div aria-hidden="true" className="bg-dots pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative grid items-center gap-10 md:grid-cols-[1.25fr_0.75fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-zest px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-ink">
              New · 14-day guide
            </p>
            <h2 id="fibermax-cta-heading" className="mt-4 font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl">
              Fibermax Reset
            </h2>
            <p className="mt-2 font-display text-xl text-paper/90">Your next two weeks, already planned.</p>
            <ul className="mt-6 grid gap-2.5 text-[15px] text-paper/90 sm:grid-cols-2">
              {['Day-by-day meal map', '18 high-fiber recipes', '2 grocery lists + prep plans', 'Daily habit trackers'].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Icon name="check" className="h-5 w-5 text-zest" strokeWidth={2.4} />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/fibermax-reset"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-paper px-8 text-base font-bold text-ink hover:bg-zest"
              >
                Get the guide · $17
                <Icon name="arrowRight" className="h-5 w-5" strokeWidth={2.4} />
              </Link>
              <p className="text-sm text-paper/70">Instant PDF download · 27 pages</p>
            </div>
          </div>
          <div className="hidden md:block" aria-hidden="true">
            <img
              src="/images/fibermax/cover.webp"
              alt=""
              width="1200"
              height="1699"
              loading="lazy"
              style={{ '--r': '3deg' }}
              className="float-slow mx-auto w-64 rotate-3 rounded-2xl shadow-2xl lg:w-72"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
