// LeadMagnetCta.jsx
// Homepage CTA section featuring the Fibermax Reset 14-day guide.
// Replaces the older 7-Day High-Protein Meal Plan promo (2026-09-17).

export default function LeadMagnetCta() {
  return (
    <section className="py-14 sm:py-20">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-forest-line bg-cream-card px-6 py-10 shadow-[0_24px_60px_rgba(30,70,51,0.12)] sm:px-12 sm:py-14">
          {/* ember corner accent, CSS only */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-ember/15"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-ember/10"
          />

          <div className="relative grid items-center gap-10 md:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-ember-dark">
                New &middot; 14-day guide
              </p>
              <h2 className="font-display text-3xl font-bold leading-tight text-forest sm:text-4xl">
                Fibermax Reset
              </h2>
              <p className="mt-2 font-display text-xl text-forest/90">
                Your next two weeks are planned.
              </p>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-forest/80">
                A gentle 14-day fiber habit guide: a day-by-day meal map, 18
                original high-fiber recipes, two grocery lists, two prep plans,
                and daily trackers. Open the plan, shop the list, follow the
                prep map.
              </p>
              <a
                href="/fibermax-reset"
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-ember-dark px-8 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-forest sm:inline-flex sm:w-auto"
              >
                Get the guide &mdash; $17
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </a>
              <p className="mt-3 text-sm text-forest/75">
                Instant PDF download &middot; 27 pages.
              </p>
            </div>

            {/* Guide cover visual */}
            <div className="hidden md:block" aria-hidden="true">
              <img
                src="/images/fibermax/cover.webp"
                alt=""
                width="1200"
                height="1699"
                loading="lazy"
                className="rotate-2 rounded-2xl border border-forest-line shadow-xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
