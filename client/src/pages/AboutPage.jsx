import React from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import MedicalDisclaimer from '../components/MedicalDisclaimer'
import Reveal from '../components/Reveal'
import Icon from '../components/Icon'
import { absUrl, absImage, recipes, nutrients, SITE_URL } from '../data/site'
import { AUTHOR, AUTHOR_LD } from '../data/author'

const METHOD = [
  {
    icon: 'book',
    title: 'USDA FoodData Central sourcing.',
    text: 'Nutrient values for each ingredient come from the USDA FoodData Central database, the reference standard for US food composition data.',
  },
  {
    icon: 'scale',
    title: 'Per-serving computation.',
    text: 'We total the nutrients across the full ingredient list and divide by the stated number of servings. Values are estimates. Your exact ingredients and portions will vary slightly.',
  },
  {
    icon: 'grid',
    title: 'Daily values.',
    text: "Percent Daily Values use the FDA's reference values for a 2,000-calorie diet (e.g. 50g protein, 18mg iron, 28g fiber).",
  },
  {
    icon: 'info',
    title: 'No disease claims.',
    text: 'We describe what nutrients do and how much is in the food. We never claim a recipe treats, cures or prevents disease.',
  },
]

const HONEST = [
  {
    title: 'Where recipes come from',
    text: 'We research and adapt practical recipes from reputable cooking sources and classic techniques, then write them up in our own words with clear steps and real per-serving numbers.',
  },
  {
    title: 'What “tested” means here',
    text: 'Only recipes marked “Tested in our kitchen” have been cooked by us. Everything else is a carefully checked recipe, not a kitchen-tested one.',
  },
  {
    title: 'How we use AI',
    text: 'AI helps us draft articles and runs the “Ask Seeker” chat. A person reviews every article before it’s published, the chat only recommends recipes from this site using our real numbers, and some recipe images are AI-generated.',
  },
  {
    title: 'Who we are not',
    text: 'We’re not doctors, dietitians or nutritionists, and nothing here is medical advice. If you’re managing a health condition or suspect a deficiency, talk to your doctor or a registered dietitian.',
  },
]

export default function AboutPage() {
  const canonical = absUrl('/about')
  const aboutLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About The Recipe Seeker',
    url: canonical,
    about: { ...AUTHOR_LD, description: AUTHOR.oneLineBio, url: SITE_URL },
  }
  return (
    <>
      <Seo
        title="About The Recipe Seeker | How We Make Our Recipes"
        description="How The Recipe Seeker works: practical recipes with per-serving nutrition from USDA data, honest about testing and AI, and never medical advice."
        canonical={canonical}
        image={absImage('/images/hero-bowl.webp')}
      />
      <JsonLd data={aboutLd} />

      <article className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
          <div>
            <Reveal as="p" immediate variant="up" className="text-xs font-bold uppercase tracking-[0.18em] text-leaf-dark">
              About us
            </Reveal>
            <Reveal as="h1" immediate variant="up" delay={60} className="mt-3 font-display text-5xl font-extrabold leading-[1.02] text-ink sm:text-7xl">
              Recipes for what your body <span className="mark-zest">needs.</span>
            </Reveal>
            <Reveal as="p" immediate variant="up" delay={120} className="mt-5 max-w-2xl text-xl leading-relaxed text-ink/70">
              The Recipe Seeker is an independent recipe site. Most recipe sites start with cravings; we start with nutrients. Search by what you need, like protein, iron or fiber, and get meals with honest per-serving numbers.
            </Reveal>
            <Reveal immediate variant="up" delay={180} className="mt-8 flex flex-wrap gap-3">
              <Link to="/recipes" className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-ink px-6 font-semibold text-paper hover:bg-leaf-dark">
                Browse the recipes <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
              <Link to="/contact" className="inline-flex min-h-[48px] items-center rounded-full border border-line bg-card px-6 font-semibold text-ink hover:border-ink/30">
                Say hello
              </Link>
            </Reveal>
          </div>
          <Reveal variant="scale" immediate className="relative mx-auto w-full max-w-sm">
            <img
              src="/images/hero-bowl.webp"
              alt="A colorful bowl of greens, chickpeas and avocado"
              width={1920}
              height={1280}
              className="aspect-[4/5] w-full rounded-[2rem] object-cover"
            />
            <span style={{ '--r': '-4deg' }} className="float-slow absolute -bottom-5 -right-3 -rotate-[4deg] rounded-2xl bg-zest px-4 py-3 font-display text-lg font-bold text-ink shadow-[var(--shadow-lift)]">
              {recipes.length} recipes & counting
            </span>
          </Reveal>
        </div>

        <section className="mx-auto mt-20 max-w-5xl" aria-labelledby="honest-heading">
          <h2 id="honest-heading" className="font-display text-3xl font-extrabold text-ink sm:text-4xl">Straight answers about how this site works</h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {HONEST.map((h) => (
              <li key={h.title} className="rounded-3xl border border-line bg-card p-6">
                <h3 className="font-display text-xl font-bold text-ink">{h.title}</h3>
                <p className="mt-2 leading-relaxed text-ink/70">{h.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20 rounded-[2rem] bg-ink px-6 py-12 text-paper sm:px-12 sm:py-16" aria-labelledby="method-heading">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zest">Our method</p>
          <h2 id="method-heading" className="mt-3 font-display text-4xl font-extrabold">How we compute nutrition</h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-2">
            {METHOD.map((m) => (
              <li key={m.title} className="flex gap-4 rounded-3xl bg-paper/5 p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zest text-ink">
                  <Icon name={m.icon} className="h-5 w-5" />
                </span>
                <span>
                  <strong className="block font-display text-xl font-bold">{m.title}</strong>
                  <span className="mt-1.5 block leading-relaxed text-paper/70">{m.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-paper/60">
            {recipes.length} recipes · {nutrients.length} nutrient hubs · every number per serving
          </p>
        </section>

        <div className="mx-auto mt-14 max-w-3xl">
          <section>
            <h2 className="font-display text-3xl font-extrabold text-ink">Corrections & contact</h2>
            <p className="mt-3 text-lg leading-relaxed text-ink/75">
              Spotted a wrong number or a step that doesn’t work? We fix errors fast. Use the{' '}
              <Link to="/contact" className="font-semibold text-ink underline decoration-zest decoration-[3px] underline-offset-4">contact page</Link>{' '}
              or email <span className="font-medium text-ink">hello@therecipeseeker.com</span>{' '}
              <span className="text-ink/55">(placeholder address)</span>.
            </p>
          </section>
          <div className="mt-10">
            <MedicalDisclaimer />
          </div>
        </div>
      </article>
    </>
  )
}
