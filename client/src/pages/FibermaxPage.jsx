import React from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import FaqAccordion from '../components/FaqAccordion'
import MedicalDisclaimer from '../components/MedicalDisclaimer'
import AuthorByline from '../components/AuthorByline'
import Reveal from '../components/Reveal'
import { absUrl, absImage } from '../data/site'

// Lemon Squeezy hosted checkout. We link straight to it: their checkout page
// is the supported, reliable purchase flow (in-page overlays get blocked by
// browser-level content blocking on real devices). The plain link also works
// with no JavaScript.
// Brand-matched checkout: Lemon Squeezy lets us tint the checkout via URL
// params — button_color here is the site's tomato orange (#E4572E).
const LEMON_CHECKOUT_URL = 'https://therecipeseeker.lemonsqueezy.com/checkout/buy/d69fd995-4c64-4add-8877-4a481911c33f?button_color=%23E4572E'
const PRICE = '$17'

const TITLE = 'Fibermax Reset: 14-Day Fiber-Rich Meal Plan + Recipes & Grocery Lists'
const DESCRIPTION =
  'Fibermax Reset is a gentle 14-day fiber habit guide: a full meal map, 18 flexible recipes, two grocery lists, two prep guides and daily trackers. Instant PDF download.'

const INSIDE = [
  {
    title: '14-day meal map',
    body: 'Breakfast, lunch, dinner and an optional snack for every day. Meals repeat on purpose, so you learn a reusable rhythm instead of following a one-off menu.',
  },
  {
    title: '18 flexible recipes',
    body: 'Repeatable breakfasts, bowls, soups and sheet-pan dinners with exact gram weights and transparent calorie, protein and fiber estimates calculated from USDA FoodData Central values.',
  },
  {
    title: '2 weekly grocery lists',
    body: 'Organized by produce, pantry, fridge and nuts + seeds. Check-your-pantry-first style, with a budget shortcut: dry lentils, store-brand oats, frozen berries and canned beans.',
  },
  {
    title: '2 prep guides',
    body: 'Two 60–75 minute Sunday prep sequences — grains, roasted vegetables, dressings and breakfast jars — mapped out minute by minute so weeknights cook themselves.',
  },
  {
    title: 'Daily comfort trackers',
    body: 'Tick-box trackers for meals, fluids, tolerance, energy and fullness across both weeks, plus a plant-variety checklist and end-of-week reflections.',
  },
  {
    title: 'Safety-first approach',
    body: 'Start-gently rules, comfort-first swaps, red-flag symptoms spelled out plainly, and clear guidance on when to slow down or ask a clinician.',
  },
]

const GALLERY = [
  { src: '/images/fibermax/cover.webp', alt: 'Fibermax Reset cover: a gentle 14-day fiber habit guide', caption: 'The cover' },
  { src: '/images/fibermax/meal-map.webp', alt: 'Inside the guide: the 14-day meal map for week one', caption: 'The 14-day meal map' },
  { src: '/images/fibermax/recipes.webp', alt: 'Inside the guide: a recipe page with ingredients, steps and nutrition', caption: 'Recipe pages with real numbers' },
  { src: '/images/fibermax/tracker.webp', alt: 'Inside the guide: the weekly comfort and hydration tracker', caption: 'Weekly trackers' },
]

const FAQS = [
  {
    q: 'Is this a detox or a cleanse?',
    a: 'No. Fibermax Reset is a meal-planning reset, not a cleanse. There is no fasting, no juice-only days and no extreme rules — just a gradual, food-first rhythm built from familiar ingredients like oats, lentils, beans, berries and whole grains.',
  },
  {
    q: 'What if beans make me feel bloated?',
    a: 'That is exactly why the plan ramps slowly: week one starts near 24 g of fiber from the three meals and builds from there. Every legume-heavy meal includes comfort-first swaps — halve the portion, start with well-cooked red lentils or smooth hummus, and simply repeat an earlier day whenever your body asks for a slower pace. Persistent or severe symptoms deserve medical advice, not a meal plan.',
  },
  {
    q: 'Is it vegetarian?',
    a: 'Yes — vegetarian by default, with simple omnivore, dairy-free and gluten-free swaps that keep the same planning framework. The structure stays the same; only the protein changes.',
  },
  {
    q: 'How do I receive the guide?',
    a: 'Instantly. After checkout you get a download link for the 27-page PDF. Read it on your phone or tablet, or print the grocery lists and trackers and stick them on the fridge.',
  },
]

function BuyButton({ children, className = '', large = false }) {
  return (
    <a
      href={LEMON_CHECKOUT_URL}
      className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-ember-dark px-8 font-display font-semibold text-white shadow-[0_10px_30px_rgba(228,87,46,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(228,87,46,0.45)] ${
        large ? 'w-full py-4 text-lg sm:w-auto' : 'py-3 text-base'
      } ${className}`}
    >
      {children}
    </a>
  )
}

export default function FibermaxPage() {
  const canonical = absUrl('/fibermax-reset')

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: TITLE,
    description: DESCRIPTION,
    image: [absImage('/images/fibermax/cover.webp')],
    brand: { '@type': 'Brand', name: 'The Recipe Seeker' },
    offers: {
      '@type': 'Offer',
      price: '17',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: LEMON_CHECKOUT_URL,
    },
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Fibermax Reset', item: canonical },
    ],
  }
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <>
      <Seo
        title={`${TITLE} | The Recipe Seeker`}
        description={DESCRIPTION}
        canonical={canonical}
        image={absImage('/images/fibermax/cover.webp')}
      />
      <JsonLd data={[productLd, breadcrumbLd, faqLd]} />

      {/* Hero */}
      <section className="overflow-hidden bg-forest">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-14">
          <div className="min-w-0">
            <Reveal as="p" immediate variant="up" className="text-sm font-semibold uppercase tracking-[0.2em] text-ember">
              A food-first guide · 14 days
            </Reveal>
            <Reveal as="h1" immediate variant="up" delay={80} className="mt-3 font-display text-5xl font-semibold leading-[1.05] text-cream sm:text-6xl">
              Fibermax Reset
            </Reveal>
            <Reveal as="p" immediate variant="up" delay={140} className="mt-4 font-display text-2xl text-cream/95 sm:text-3xl">
              Your next two weeks are planned.
            </Reveal>
            <Reveal variant="fade" delay={200} as="p" className="mt-5 max-w-lg text-lg leading-relaxed text-cream/80">
              A gentle 14-day fiber habit guide for busy beginners — 18 flexible recipes, two
              grocery lists, and a prep rhythm you can actually repeat. No detox, no extreme
              rules: just simple meals, flexible portions, and a little more fiber every day.
            </Reveal>
            <Reveal variant="up" delay={260} className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <BuyButton large >Get the guide — {PRICE}</BuyButton>
              <p className="text-sm text-cream/70">
                Instant PDF download · 27 pages<br />Pay once, keep forever
              </p>
            </Reveal>
          </div>
          <Reveal variant="fade" delay={160} className="min-w-0">
            <img
              src="/images/fibermax/cover.webp"
              alt="Fibermax Reset cover — a gentle 14-day fiber habit guide"
              className="mx-auto w-full max-w-sm rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.35)] lg:max-w-md"
              loading="eager"
              width={1200}
              height={1699}
            />
          </Reveal>
        </div>
      </section>

      {/* What's inside */}
      <section className="bg-cream" aria-labelledby="fx-inside">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal variant="up" as="h2" id="fx-inside" className="text-center font-display text-3xl font-semibold text-forest sm:text-4xl">
            What&rsquo;s inside
          </Reveal>
          <Reveal variant="fade" as="p" className="mx-auto mt-3 max-w-2xl text-center text-lg text-forest/75">
            Open the plan, shop the list, follow the prep map. Everything is built to be
            repeated — not just read once.
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {INSIDE.map((item, i) => (
              <Reveal key={item.title} variant="up" delay={Math.min(i * 70, 280)} className="min-w-0 rounded-3xl border border-forest-line bg-cream-card p-6 shadow-[0_8px_30px_rgba(30,70,51,0.08)]">
                <h3 className="font-display text-xl font-semibold text-forest">{item.title}</h3>
                <p className="mt-2 leading-relaxed text-forest/80">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Inside look */}
      <section className="bg-cream-card" aria-labelledby="fx-look">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal variant="up" as="h2" id="fx-look" className="text-center font-display text-3xl font-semibold text-forest sm:text-4xl">
            Take a look inside
          </Reveal>
          <Reveal variant="fade" as="p" className="mx-auto mt-3 max-w-2xl text-center text-lg text-forest/75">
            Real pages from the guide — the meal map, a recipe page, and the weekly tracker.
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {GALLERY.map((img, i) => (
              <Reveal key={img.src} variant="up" delay={Math.min(i * 70, 280)} className="min-w-0">
                <figure className="overflow-hidden rounded-2xl border border-forest-line bg-white shadow-[0_8px_30px_rgba(30,70,51,0.10)]">
                  <img
                    src={img.src}
                    alt={img.alt}
                    loading="lazy"
                    width={1200}
                    height={1699}
                    className="aspect-[3/4] w-full object-cover object-top"
                  />
                  <figcaption className="px-4 py-3 text-center text-sm font-medium text-forest/80">
                    {img.caption}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
          <Reveal variant="up" className="mt-10 text-center">
            <BuyButton >Get the full 27-page guide — {PRICE}</BuyButton>
          </Reveal>
        </div>
      </section>

      {/* Who it's for / not for */}
      <section className="bg-cream" aria-labelledby="fx-who">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal variant="up" as="h2" id="fx-who" className="text-center font-display text-3xl font-semibold text-forest sm:text-4xl">
            Is it for you?
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Reveal variant="up" className="min-w-0 rounded-3xl border border-forest-line bg-forest-soft p-7">
              <h3 className="font-display text-xl font-semibold text-forest">This is for you if…</h3>
              <ul className="mt-4 list-disc space-y-2.5 pl-6 leading-relaxed text-forest/85 marker:text-ember">
                <li>You&rsquo;re a generally healthy adult who wants a gentler, food-first structure for eating more fiber-rich foods.</li>
                <li>You&rsquo;re a busy beginner — you&rsquo;d rather repeat simple meals than rebuild a plan every morning.</li>
                <li>You like having the week mapped out: the meals, the grocery list, the prep order.</li>
              </ul>
            </Reveal>
            <Reveal variant="up" delay={120} className="min-w-0 rounded-3xl border border-forest-line bg-cream-card p-7">
              <h3 className="font-display text-xl font-semibold text-forest">This is not for you if…</h3>
              <ul className="mt-4 list-disc space-y-2.5 pl-6 leading-relaxed text-forest/85 marker:text-ember">
                <li>You&rsquo;re managing IBS, IBD, bowel obstruction, swallowing difficulty or any medical condition — this guide isn&rsquo;t designed for that.</li>
                <li>You&rsquo;re pregnant, take medicines affected by diet, or have persistent or severe digestive symptoms.</li>
              </ul>
              <p className="mt-4 text-forest/85">
                In those cases, please talk to a qualified clinician before changing your intake.{' '}
                <Link to="/disclaimer" className="font-medium text-ember-dark underline decoration-ember/60 underline-offset-2">
                  Read our full disclaimer
                </Link>
                .
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-cream-card" aria-labelledby="fx-faq">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal variant="up" as="h2" id="fx-faq" className="text-center font-display text-3xl font-semibold text-forest sm:text-4xl">
            Questions, answered
          </Reveal>
          <div className="mt-8">
            <FaqAccordion faqs={FAQS} idPrefix="faq-fibermax" />
          </div>
          <Reveal variant="fade" as="div" className="mt-8">
            <AuthorByline />
          </Reveal>
        </div>
      </section>

      {/* Safety note */}
      <section className="bg-cream" aria-label="Safety note">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <Reveal variant="up">
            <MedicalDisclaimer />
          </Reveal>
          <Reveal variant="fade" as="p" className="mt-4 text-center text-sm text-forest/70">
            Fibermax Reset is general nutrition education — not a detox, weight-loss program,
            or medical treatment. Nutrition values in the guide are estimates, not lab analyses.
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-forest" aria-labelledby="fx-final">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <Reveal variant="up" as="h2" id="fx-final" className="font-display text-3xl font-semibold text-cream sm:text-4xl">
            Your next two weeks are planned.
          </Reveal>
          <Reveal variant="fade" as="p" className="mx-auto mt-4 max-w-xl text-lg text-cream/80">
            14 days of meals, 18 recipes, two grocery lists and a prep rhythm you&rsquo;ll
            actually reuse — for less than a takeout dinner.
          </Reveal>
          <Reveal variant="up" className="mt-8">
            <BuyButton large >Get Fibermax Reset — {PRICE}</BuyButton>
          </Reveal>
          <Reveal variant="fade" as="p" className="mt-4 text-sm text-cream/70">
            Instant PDF download · 27 pages · Pay once, keep forever
          </Reveal>
        </div>
      </section>

    </>
  )
}
