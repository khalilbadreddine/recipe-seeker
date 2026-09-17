import React, { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import RecipeCard from '../components/RecipeCard'
import LeadMagnetCta from '../components/LeadMagnetCta'
import ResponsiveImage from '../components/ResponsiveImage'
import Reveal, { Parallax } from '../components/Reveal'
import NutrientIcon from '../components/NutrientIcon'
import { SITE_URL, absUrl, absImage, recipes, nutrients, site, getPost, getNutrient } from '../data/site'

/** Curated featured pool (slugs) — covers high-protein, iron-rich, and quick tabs. */
const FEATURED_POOL = [
  'salmon-kale-pesto-pasta',
  'spinach-feta-stuffed-chicken',
  'garlic-lemon-chicken-quinoa',
  'turkey-spinach-meatballs',
  'lentil-bolognese',
  'white-bean-shakshuka',
  'tempeh-rainbow-buddha-bowl',
  'black-bean-quinoa-burgers',
  'sardine-avocado-toast',
  'greek-yogurt-breakfast-bowl',
  'avocado-egg-toast',
  'lentil-curry-stew',
]

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'protein', label: 'High-Protein' },
  { id: 'iron', label: 'Iron-Rich' },
  { id: 'quick', label: 'Quick' },
]

function nutrientAmount(recipe, key) {
  const n = recipe.nutrition[key]
  return n ? n.amount || 0 : 0
}

function matchesTab(recipe, tabId) {
  if (tabId === 'protein') return nutrientAmount(recipe, 'protein') >= 20
  if (tabId === 'iron') return nutrientAmount(recipe, 'iron') >= 4
  if (tabId === 'quick') return (recipe.totalMinutes || 0) <= 30
  return true
}

/** Hero quick chips — every one links to a real destination. */
const QUICK_CHIPS = [
  { label: 'Iron', to: '/nutrients/iron', icon: 'iron' },
  { label: 'High Protein', to: '/nutrients/protein', icon: 'protein' },
  { label: 'Fiber', to: '/nutrients/fiber', icon: 'fiber' },
  { label: 'Vitamin C', to: '/nutrients/vitamin-c', icon: 'vitamin-c' },
  { label: 'Vegetarian', to: '/search?q=vegetarian' },
  { label: 'Under 30 Minutes', to: '/search?maxTime=30' },
]

const LEARN_SLUGS = [
  'iron-vitamin-c-food-pairings',
  'foods-that-block-iron-absorption',
  'what-to-eat-in-a-day-for-iron',
]

function GoalIcon({ kind }) {
  const paths = {
    clock: 'M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z',
    leaf: 'M5 19C5 9 13 5 20 4c0 8-4 15-13 15m0 0c3-5 7-9 11-11',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  }
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[kind] || paths.grid} />
    </svg>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all')
  const searchRef = useRef(null)

  const canonical = absUrl('/')
  const title = 'The Recipe Seeker - Find Recipes by What Your Body Needs'
  const description =
    'Nutrition-first recipes searchable by nutrient. Find high-protein, iron-rich, high-fiber meals with real per-serving nutrition data.'

  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: SITE_URL,
    description: site.tagline,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  const featuredRecipes = useMemo(() => {
    const pool = FEATURED_POOL.map((slug) => recipes.find((r) => r.slug === slug)).filter(Boolean)
    const filtered = pool.filter((r) => matchesTab(r, tab))
    return tab === 'all' ? filtered.slice(0, 8) : filtered
  }, [tab])

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Featured recipes',
    itemListElement: featuredRecipes.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absUrl(`/recipes/${r.slug}`),
      name: r.title,
      image: absImage(r.image),
    })),
  }

  const goalCards = useMemo(() => {
    const countBy = (fn) => recipes.filter(fn).length
    return [
      {
        title: 'I need more iron',
        text: `${countBy((r) => (r.tags.nutrients || []).includes('iron'))} iron-rich recipes, from lentil bolognese to white bean shakshuka.`,
        to: '/nutrients/iron',
        icon: <NutrientIcon iconKey="iron" className="h-6 w-6" />,
      },
      {
        title: 'I want high-protein meals',
        text: 'Meals with 20g+ protein per serving — real food that keeps you full for hours.',
        to: '/nutrients/protein',
        icon: <NutrientIcon iconKey="protein" className="h-6 w-6" />,
      },
      {
        title: 'Quick weeknight meals',
        text: `${countBy((r) => (r.totalMinutes || 0) <= 30)} recipes on the table in 30 minutes or less. No compromise on nutrition.`,
        to: '/search?maxTime=30',
        icon: <GoalIcon kind="clock" />,
      },
      {
        title: 'More fiber, please',
        text: `${countBy((r) => (r.tags.nutrients || []).includes('fiber'))} fiber-packed recipes for gut-friendly, satisfying eating.`,
        to: '/nutrients/fiber',
        icon: <NutrientIcon iconKey="fiber" className="h-6 w-6" />,
      },
      {
        title: 'Eat more plants',
        text: `${countBy((r) => (r.tags.diets || []).includes('vegetarian'))} vegetarian recipes rich in the nutrients plants do best.`,
        to: '/search?q=vegetarian',
        icon: <GoalIcon kind="leaf" />,
      },
      {
        title: 'Improve a nutrient',
        text: `Browse all ${nutrients.length} nutrient hubs — zinc, B12, magnesium, calcium and more.`,
        to: '/nutrients',
        icon: <GoalIcon kind="grid" />,
      },
    ]
  }, [])

  const learnPosts = useMemo(() => LEARN_SLUGS.map((slug) => getPost(slug)).filter(Boolean), [])

  const submitSearch = (e) => {
    e.preventDefault()
    navigate(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search')
  }

  return (
    <>
      <Seo title={title} description={description} canonical={canonical} image={absImage('/images/hero-bowl.webp')} />
      <JsonLd data={[websiteLd, itemListLd]} />

      {/* HERO — functional: search is the star */}
      <section className="overflow-hidden">
        <div className="mx-auto max-w-3xl px-4 pt-12 text-center sm:px-6 lg:pt-16">
          <Reveal immediate variant="up">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ember-dark">Nutrition-first recipes</p>
          </Reveal>
          <Reveal as="h1" immediate variant="up" delay={70} className="mt-3 font-display text-4xl font-semibold leading-[1.05] text-forest sm:text-5xl lg:text-6xl">
            Find recipes by what your body needs
          </Reveal>
          <Reveal as="p" immediate variant="up" delay={140} className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-forest/75">
            Practical, delicious meals with per-serving nutrition information. Search by nutrient, diet, or craving.
          </Reveal>
          <Reveal as="form" immediate variant="up" delay={210} onSubmit={submitSearch} className="mx-auto mt-7 flex max-w-xl flex-col items-stretch gap-3 sm:flex-row sm:items-center" role="search">
            <label htmlFor="home-search" className="sr-only">Search recipes</label>
            <div className="relative w-full sm:flex-1">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-forest/40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                ref={searchRef}
                id="home-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try “iron-rich dinner” or “30g protein”…"
                className="w-full rounded-full border border-forest-line bg-cream-card py-4 pl-12 pr-5 text-base text-forest shadow-sm outline-none placeholder:text-forest/90 focus:border-ember"
              />
            </div>
            <button type="submit" className="w-full shrink-0 rounded-full bg-ember-dark px-7 py-4 text-base font-semibold text-white shadow-sm transition hover:shadow-md sm:w-auto">
              Find a recipe
            </button>
          </Reveal>
          <Reveal immediate variant="up" delay={280} className="mt-6">
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
              <div className="flex w-max gap-2.5 sm:w-auto sm:flex-wrap sm:justify-center">
                {QUICK_CHIPS.map((chip) => (
                  <Link
                    key={chip.label}
                    to={chip.to}
                    className="inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full border border-forest/25 bg-cream-card px-4 py-2.5 text-sm font-semibold text-forest transition hover:border-forest hover:bg-forest hover:text-cream"
                  >
                    {chip.icon && <NutrientIcon iconKey={chip.icon} />}
                    {chip.label}
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
        <Reveal variant="scale" immediate delay={200} className="mx-auto mt-10 max-w-5xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-[2rem] shadow-[0_24px_60px_rgba(30,70,51,0.18)]">
            <Parallax speed={0.08} className="aspect-[16/10] w-full sm:aspect-[21/9]">
              <ResponsiveImage
                src="/images/hero-bowl.webp"
                alt="Fresh salad bowl with avocado, chickpeas and greens"
                width={1200}
                height={514}
                fetchPriority="high"
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="h-full w-full scale-[1.15] object-cover"
              />
            </Parallax>
          </div>
        </Reveal>
      </section>

      {/* GOAL-BASED ENTRY POINTS */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal as="h2" variant="up" className="text-center font-display text-3xl font-semibold text-forest sm:text-4xl">
          What are you looking for?
        </Reveal>
        <Reveal as="p" variant="up" delay={80} className="mx-auto mt-3 max-w-xl text-center text-lg text-forest/75">
          Start from your goal — we’ll match it to recipes rich in exactly what you need.
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {goalCards.map((card, i) => (
            <Reveal key={card.title} variant="up" delay={Math.min(i * 60, 300)}>
              <Link
                to={card.to}
                className="group flex h-full items-start gap-4 rounded-3xl border border-forest-line bg-cream-card p-6 shadow-[0_8px_30px_rgba(30,70,51,0.08)] transition hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(30,70,51,0.14)]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-forest text-cream transition group-hover:bg-ember-dark">
                  {card.icon}
                </span>
                <span className="min-w-0">
                  <span className="font-display text-xl font-semibold text-forest group-hover:text-ember-dark">
                    {card.title}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-forest/75">{card.text}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-ember-dark">
                    Explore <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FEATURED RECIPES */}
      <section className="bg-cream-card/60 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal as="h2" variant="up" className="text-center font-display text-3xl font-semibold text-forest sm:text-4xl">
            Featured recipes
          </Reveal>
          <Reveal as="p" variant="up" delay={80} className="mx-auto mt-3 max-w-xl text-center text-lg text-forest/75">
            Handpicked for protein, iron, and speed — every one with full per-serving nutrition.
          </Reveal>
          <Reveal variant="fade" delay={140} className="mt-8">
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Filter featured recipes">
              <div className="flex w-max gap-2.5 sm:w-auto sm:justify-center">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={`min-h-[44px] whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                      tab === t.id
                        ? 'bg-forest text-cream'
                        : 'border border-forest/25 bg-cream text-forest hover:border-forest'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
            {featuredRecipes.map((r, i) => (
              <Reveal key={r.slug} variant="up" delay={Math.min(i * 60, 360)} className={i === 0 ? 'sm:col-span-2 lg:col-span-2' : ''}>
                <RecipeCard recipe={r} />
              </Reveal>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              to="/recipes"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-forest/30 px-7 py-3 font-semibold text-forest transition hover:border-forest hover:bg-forest hover:text-cream"
            >
              Browse all {recipes.length} recipes <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* LEARN — nutrition-first food writing */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal as="h2" variant="up" className="text-center font-display text-3xl font-semibold text-forest sm:text-4xl">
          Nutrition-first food writing
        </Reveal>
        <Reveal as="p" variant="up" delay={80} className="mx-auto mt-3 max-w-xl text-center text-lg text-forest/75">
          The science behind the plate — practical guides tied to real recipes.
        </Reveal>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {learnPosts.map((post, i) => (
            <Reveal key={post.slug} variant="up" delay={Math.min(i * 80, 240)}>
              <article className="group h-full overflow-hidden rounded-3xl border border-forest-line bg-cream-card shadow-[0_8px_30px_rgba(30,70,51,0.08)] transition hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(30,70,51,0.14)]">
                <Link to={`/blog/${post.slug}`} className="block h-full">
                  <div className="overflow-hidden">
                    <ResponsiveImage
                      src={post.image}
                      alt={post.title}
                      loading="lazy"
                      width={800}
                      height={533}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="aspect-[3/2] w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="px-6 pb-6 pt-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-ember-dark">{post.category}</p>
                    <h3 className="mt-2 font-display text-[22px] font-semibold leading-snug text-forest group-hover:text-ember-dark">
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-pretty text-sm leading-relaxed text-forest/80">{post.description}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ember-dark">
                      Read article <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
                    </span>
                  </div>
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            to="/blog"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-forest/30 px-7 py-3 font-semibold text-forest transition hover:border-forest hover:bg-forest hover:text-cream"
          >
            All articles <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* MEAL-PLAN OFFER — after the value has been shown */}
      <Reveal variant="up">
        <LeadMagnetCta />
      </Reveal>
    </>
  )
}
