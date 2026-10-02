import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import RecipeCard from '../components/RecipeCard'
import PostCard from '../components/PostCard'
import LeadMagnetCta from '../components/LeadMagnetCta'
import AskSeeker from '../components/AskSeeker'
import RecentlyViewed from '../components/RecentlyViewed'
import ResponsiveImage from '../components/ResponsiveImage'
import Reveal from '../components/Reveal'
import Icon from '../components/Icon'
import NutrientIcon from '../components/NutrientIcon'
import { SectionHeading } from '../components/ContentBlocks'
import { SITE_URL, absUrl, absImage, recipes, nutrients, site, getPost, getNutrient, formatAmount } from '../data/site'
import { nutrientMeta, tint, topRecipesBy, recipesForNutrient } from '../data/nutrientMeta'

/** Curated featured pool (slugs): covers high-protein, iron-rich, and quick tabs. */
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
  { id: 'protein', label: 'High-protein' },
  { id: 'iron', label: 'Iron-rich' },
  { id: 'quick', label: 'Under 30 min' },
]

const nutrientAmount = (recipe, key) => recipe.nutrition[key]?.amount || 0

function matchesTab(recipe, tabId) {
  if (tabId === 'protein') return nutrientAmount(recipe, 'protein') >= 20
  if (tabId === 'iron') return nutrientAmount(recipe, 'iron') >= 4
  if (tabId === 'quick') return (recipe.totalMinutes || 0) <= 30
  return true
}

/** Nutrients offered in the hero picker. */
const PICKER = ['iron', 'protein', 'fiber', 'vitaminC', 'calcium', 'omega3']

const POPULAR = [
  { label: 'iron-rich dinner', to: '/search?nutrient=iron&min=4' },
  { label: '30g protein', to: '/search?nutrient=protein&min=30' },
  { label: 'vegetarian', to: '/search?q=vegetarian' },
  { label: 'under 30 minutes', to: '/search?maxTime=30' },
]

const LEARN_SLUGS = ['iron-vitamin-c-food-pairings', 'foods-that-block-iron-absorption', 'what-to-eat-in-a-day-for-iron']

/** Hero widget: "I need more ___" → the top recipes for that nutrient, with real numbers. */
function NutrientPicker() {
  const [active, setActive] = useState('iron')
  const hub = getNutrient(active)
  const meta = nutrientMeta(active)
  const top = useMemo(() => topRecipesBy(active, 3), [active])
  const count = hub ? recipesForNutrient(hub).length : 0
  const dvNumber = hub ? parseFloat(hub.dailyValue) : 0

  return (
    <div className="relative rounded-[2rem] bg-ink p-5 text-paper shadow-[var(--shadow-lift)] sm:p-7">
      <p className="font-display text-2xl font-bold sm:text-3xl">
        I need more <span className="text-zest">{hub?.name.toLowerCase()}</span>
      </p>
      <div className="no-scrollbar -mx-5 mt-4 overflow-x-auto px-5 sm:-mx-7 sm:px-7" role="tablist" aria-label="Choose a nutrient">
        <div className="flex w-max gap-2">
          {PICKER.map((key) => {
            const n = getNutrient(key)
            const on = key === active
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="picker-panel"
                onClick={() => setActive(key)}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded-full px-3.5 text-sm font-semibold ${
                  on ? 'bg-paper text-ink' : 'bg-paper/10 text-paper/80 hover:bg-paper/20'
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: nutrientMeta(key).color }} aria-hidden="true" />
                {n?.name}
              </button>
            )
          })}
        </div>
      </div>

      <div id="picker-panel" role="tabpanel" aria-live="polite" className="mt-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-paper/50">Top recipes per serving</p>
        <ul key={active} className="mt-3 space-y-2.5">
          {top.map((r, i) => {
            const n = r.nutrition[active]
            const pct = Math.min(100, Math.round(n.dv || (dvNumber ? (n.amount / dvNumber) * 100 : 0)))
            return (
              <li key={r.slug} className="pop-in" style={{ animationDelay: `${i * 60}ms` }}>
                <Link to={`/recipes/${r.slug}`} className="flex items-center gap-3 rounded-2xl bg-paper/5 p-2.5 hover:bg-paper/10">
                  <ResponsiveImage src={r.image} alt="" width={112} height={112} sizes="64px" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{r.title}</span>
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper/15">
                        <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
                      </span>
                      <span className="shrink-0 text-xs font-bold tabular-nums text-paper/80">
                        {formatAmount(n.amount, n.unit)} · {pct}%
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
        {hub && (
          <Link
            to={`/nutrients/${hub.slug || hub.key}`}
            className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-zest px-5 text-sm font-bold text-ink hover:brightness-95"
          >
            See all {count} {hub.name.toLowerCase()} recipes <Icon name="arrowRight" className="h-4 w-4" strokeWidth={2.4} />
          </Link>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all')

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
    return filtered.slice(0, 6)
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

  const quickRecipes = useMemo(
    () => [...recipes].filter((r) => (r.totalMinutes || 0) <= 20).sort((a, b) => a.totalMinutes - b.totalMinutes).slice(0, 10),
    [],
  )

  const goals = useMemo(() => {
    const countBy = (fn) => recipes.filter(fn).length
    return [
      { title: 'More energy', text: 'Iron-rich meals, paired with vitamin C for better absorption.', to: '/nutrients/iron', key: 'iron', count: countBy((r) => r.tags.nutrients.includes('iron')) },
      { title: 'Stay full longer', text: '20g+ protein per serving from real food.', to: '/nutrients/protein', key: 'protein', count: countBy((r) => nutrientAmount(r, 'protein') >= 20) },
      { title: 'Happy gut', text: 'Fiber-packed breakfasts, lunches and snacks.', to: '/nutrients/fiber', key: 'fiber', count: countBy((r) => r.tags.nutrients.includes('fiber')) },
      { title: 'Strong bones', text: 'Calcium and vitamin D, without a glass of milk at every meal.', to: '/nutrients/calcium', key: 'calcium', count: countBy((r) => r.tags.nutrients.includes('calcium')) },
    ]
  }, [])

  const vegCount = recipes.filter((r) => r.tags.diets.includes('vegetarian') || r.tags.diets.includes('vegan')).length
  const learnPosts = useMemo(() => LEARN_SLUGS.map((slug) => getPost(slug)).filter(Boolean), [])

  const submitSearch = (e) => {
    e.preventDefault()
    navigate(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search')
  }

  return (
    <>
      <Seo title={title} description={description} canonical={canonical} image={absImage('/images/hero-bowl.webp')} />
      <JsonLd data={[websiteLd, itemListLd]} />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="bg-dots pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 [&>*]:min-w-0 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14 lg:pb-24 lg:pt-16">
          <div>
            <Reveal immediate variant="up">
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink/70">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zest">
                  <Icon name="leaf" className="h-3 w-3" strokeWidth={2.4} />
                </span>
                {recipes.length} recipes · nutrition from USDA data
              </p>
            </Reveal>
            <Reveal as="h1" immediate variant="up" delay={70} className="mt-5 font-display text-[2.75rem] font-extrabold leading-[0.98] text-ink sm:text-6xl lg:text-7xl">
              Find recipes by what your body <span className="mark-zest">needs.</span>
            </Reveal>
            <Reveal as="p" immediate variant="up" delay={140} className="mt-6 max-w-xl text-lg leading-relaxed text-ink/70 sm:text-xl">
              Search by nutrient, not just by craving. Every recipe shows real per-serving numbers for protein, iron, fiber and more.
            </Reveal>
            <Reveal as="form" immediate variant="up" delay={210} onSubmit={submitSearch} role="search" className="mt-8 max-w-xl">
              <label htmlFor="home-search" className="sr-only">Search recipes</label>
              <div className="flex items-center gap-2 rounded-full border border-line bg-card p-1.5 shadow-[var(--shadow-card)] focus-within:ring-2 focus-within:ring-leaf">
                <Icon name="search" className="ml-3 h-5 w-5 shrink-0 text-ink/40" />
                <input
                  id="home-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Try “salmon”, “lentils” or “vegan”"
                  className="min-w-0 flex-1 bg-transparent py-3 text-base text-ink outline-none placeholder:text-ink/40 focus-visible:outline-none"
                />
                <button type="submit" className="min-h-[48px] shrink-0 rounded-full bg-ink px-5 text-[15px] font-bold text-paper hover:bg-leaf-dark sm:px-7">
                  Search
                </button>
              </div>
            </Reveal>
            <Reveal immediate variant="up" delay={260} className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink/50">Popular:</span>
              {POPULAR.map((p) => (
                <Link key={p.label} to={p.to} className="inline-flex min-h-[36px] items-center rounded-full bg-mist px-3.5 font-medium text-ink/80 hover:bg-ink hover:text-paper">
                  {p.label}
                </Link>
              ))}
            </Reveal>
          </div>

          <Reveal immediate variant="scale" delay={180}>
            <NutrientPicker />
          </Reveal>
        </div>
      </section>

      {/* ASK SEEKER (AI chat) */}
      <section id="ask" className="mx-auto mb-24 max-w-7xl scroll-mt-24 px-4 sm:px-6" aria-labelledby="ask-heading">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14 [&>*]:min-w-0">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-zest">
              <Icon name="sparkle" className="h-3.5 w-3.5" /> New · Ask AI
            </p>
            <h2 id="ask-heading" className="mt-4 font-display text-4xl font-extrabold leading-[1.04] text-ink sm:text-5xl">
              Not sure what to cook? <span className="mark-zest">Just ask.</span>
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink/65">
              Seeker knows every recipe on this site and its real per-serving numbers. Describe what you need in your own words and get matching recipes in seconds.
            </p>
            <ul className="mt-6 space-y-3 text-[15px] text-ink/75">
              {[
                'Combine needs: “iron-rich, vegetarian, under 30 minutes”',
                'Leave things out: “no fish”, “nut-free”, “dairy-free”',
                'Follow up: “any quicker ones?”',
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zest">
                    <Icon name="check" className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <Reveal variant="up">
            <AskSeeker />
          </Reveal>
        </div>
      </section>

      <RecentlyViewed />

      {/* NUTRIENT SPECTRUM */}
      <section id="nutrients" className="mx-auto max-w-7xl scroll-mt-24 px-4 sm:px-6" aria-labelledby="spectrum-heading">
        <SectionHeading
          id="spectrum-heading"
          eyebrow="Browse by nutrient"
          title="Twelve nutrients. One color each."
          intro="Tap a nutrient to see what it does, how much you need, the best foods for it and every recipe rich in it."
        />
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {nutrients.map((n, i) => {
            const meta = nutrientMeta(n.key)
            const count = recipesForNutrient(n).length
            return (
              <Reveal as="li" key={n.key} variant="up" delay={Math.min(i * 35, 300)}>
                <Link
                  to={`/nutrients/${n.slug || n.key}`}
                  className="group flex h-full flex-col justify-between gap-6 rounded-3xl p-4 hover:-translate-y-1 sm:p-5"
                  style={{ backgroundColor: tint(meta.color, 0.13) }}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: meta.color }}>
                    <NutrientIcon iconKey={n.slug || n.key} className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-display text-lg font-bold leading-tight text-ink">{n.name}</span>
                    <span className="mt-0.5 block text-xs font-medium text-ink/60">{count} recipes</span>
                  </span>
                </Link>
              </Reveal>
            )
          })}
        </ul>
      </section>

      {/* FEATURED */}
      <section id="recipes" className="mx-auto mt-24 max-w-7xl scroll-mt-24 px-4 sm:px-6" aria-labelledby="featured-heading">
        <SectionHeading
          id="featured-heading"
          eyebrow="Editor's picks"
          title="Featured recipes"
          action={
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Filter featured recipes">
              <div className="flex w-max gap-2 rounded-full bg-mist p-1">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={`min-h-[40px] whitespace-nowrap rounded-full px-4 text-sm font-semibold ${
                      tab === t.id ? 'bg-card text-ink shadow-sm' : 'text-ink/60 hover:text-ink'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          }
        />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
          {featuredRecipes.map((r, i) => (
            <Reveal key={`${tab}-${r.slug}`} variant="up" delay={Math.min(i * 60, 300)}>
              <RecipeCard recipe={r} />
            </Reveal>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link to="/recipes" className="inline-flex min-h-[52px] items-center gap-2 rounded-full bg-ink px-8 font-bold text-paper hover:bg-leaf-dark">
            Browse all {recipes.length} recipes <Icon name="arrowRight" className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* GOALS */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6" aria-labelledby="goals-heading">
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:gap-6">
          <div className="flex flex-col justify-between rounded-[2rem] bg-zest p-7 sm:p-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/60">Start from a goal</p>
              <h2 id="goals-heading" className="mt-3 font-display text-4xl font-extrabold leading-[1.02] text-ink sm:text-5xl">
                What do you want food to do for you?
              </h2>
            </div>
            <div className="mt-10 space-y-3">
              <Link to="/search?q=vegetarian" className="flex items-center justify-between gap-3 rounded-2xl bg-ink/5 px-5 py-4 font-semibold text-ink hover:bg-ink/10">
                <span>Eat more plants <span className="font-normal text-ink/60">· {vegCount} meat-free recipes</span></span>
                <Icon name="arrowRight" className="h-5 w-5" />
              </Link>
              <Link to="/day-builder" className="flex items-center justify-between gap-3 rounded-2xl bg-ink px-5 py-4 font-semibold text-paper hover:bg-leaf-dark">
                <span>Plan a whole day of eating</span>
                <Icon name="arrowRight" className="h-5 w-5" />
              </Link>
            </div>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {goals.map((g, i) => {
              const meta = nutrientMeta(g.key)
              return (
                <Reveal as="li" key={g.title} variant="up" delay={i * 60}>
                  <Link to={g.to} className="group flex h-full flex-col rounded-[2rem] border border-line bg-card p-6 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: tint(meta.color, 0.15), color: meta.color }}>
                      <NutrientIcon iconKey={g.key} className="h-6 w-6" />
                    </span>
                    <span className="mt-6 font-display text-2xl font-bold text-ink">{g.title}</span>
                    <span className="mt-1.5 flex-1 text-[15px] leading-relaxed text-ink/65">{g.text}</span>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                      {g.count} recipes <Icon name="arrowRight" className="h-4 w-4 transition group-hover:translate-x-1" />
                    </span>
                  </Link>
                </Reveal>
              )
            })}
          </ul>
        </div>
      </section>

      {/* QUICK CAROUSEL */}
      <section className="mt-24" aria-labelledby="quick-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            id="quick-heading"
            eyebrow="Weeknight rescue"
            title="Ready in 20 minutes or less"
            action={
              <Link to="/search?maxTime=30" className="inline-flex items-center gap-1.5 font-semibold text-ink hover:text-leaf-dark">
                More quick meals <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            }
          />
        </div>
        <div className="no-scrollbar snap-row mx-auto mt-8 flex max-w-7xl gap-4 overflow-x-auto px-4 pb-2 sm:px-6">
          {quickRecipes.map((r) => (
            <div key={r.slug} className="w-[78%] shrink-0 sm:w-[44%] lg:w-[23.5%]">
              <RecipeCard recipe={r} maxBadges={2} />
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6" aria-labelledby="how-heading">
        <div className="rounded-[2rem] bg-ink px-6 py-12 text-paper sm:px-12 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zest">How it works</p>
          <h2 id="how-heading" className="mt-3 max-w-2xl font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl">
            Honest numbers. Real food. No miracle claims.
          </h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { n: '01', t: 'Pick what you need', d: 'Choose a nutrient or goal: iron, protein, fiber, calcium and more.' },
              { n: '02', t: 'See the real numbers', d: 'Every recipe lists per-serving nutrition and % daily value, computed from USDA ingredient data.' },
              { n: '03', t: 'Cook, save, plan', d: 'Use cook mode in the kitchen, save favorites, and build a full day in My Day.' },
            ].map((s) => (
              <li key={s.n} className="border-t border-paper/15 pt-6">
                <span className="font-display text-5xl font-extrabold text-zest">{s.n}</span>
                <h3 className="mt-4 font-display text-2xl font-bold">{s.t}</h3>
                <p className="mt-2 leading-relaxed text-paper/70">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* LEARN */}
      {learnPosts.length > 0 && (
        <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6" aria-labelledby="learn-heading">
          <SectionHeading
            id="learn-heading"
            eyebrow="From the blog"
            title="The science behind the plate"
            action={
              <Link to="/blog" className="inline-flex items-center gap-1.5 font-semibold text-ink hover:text-leaf-dark">
                All articles <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            }
          />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {learnPosts.map((post, i) => (
              <Reveal key={post.slug} variant="up" delay={i * 70}>
                <PostCard post={post} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* FIBERMAX */}
      <div className="mt-24">
        <Reveal variant="up">
          <LeadMagnetCta />
        </Reveal>
      </div>
    </>
  )
}
