import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Seo from '../components/Seo'
import FavoriteButton from '../components/FavoriteButton'
import JsonLd from '../components/JsonLd'
import Breadcrumbs from '../components/Breadcrumbs'
import NutrientBadge from '../components/NutrientBadge'
import RecipeCard from '../components/RecipeCard'
import NutritionTable from '../components/NutritionTable'
import FaqAccordion from '../components/FaqAccordion'
import RatingWidget from '../components/RatingWidget'
import MedicalDisclaimer from '../components/MedicalDisclaimer'
import AuthorByline from '../components/AuthorByline'
import ResponsiveImage from '../components/ResponsiveImage'
import PrintButton from '../components/PrintButton'
import CookMode from '../components/CookMode'
import Icon from '../components/Icon'
import Reveal from '../components/Reveal'
import { SectionHeading } from '../components/ContentBlocks'
import { scaleAmount } from '../lib/scaleAmount'
import { rememberRecipe, addToDay, slotFor } from '../lib/localPrefs'
import { useDetail } from '../lib/details'
import { useShoppingList } from '../context/ShoppingListContext'
import { absUrl, absImage, getRecipe, getNutrient, recipes, formatAmount } from '../data/site'
import { nutrientMeta, tint, DIET_LABELS, MEAL_LABELS } from '../data/nutrientMeta'
import pins from '../data/pins.json'

/** schema.org nutrition field names for the keys we track. */
const NUTRITION_MAP = {
  calories: 'calories',
  protein: 'proteinContent',
  carbs: 'carbohydrateContent',
  fiber: 'fiberContent',
  sugar: 'sugarContent',
  fat: 'fatContent',
  saturatedFat: 'saturatedFatContent',
  transFat: 'transFatContent',
  cholesterol: 'cholesterolContent',
  sodium: 'sodiumContent',
  servingSize: 'servingSize',
}

/** Diet tags (lowercase in the data) → schema.org RestrictedDiet. */
const DIET_MAP = {
  vegan: 'https://schema.org/VeganDiet',
  vegetarian: 'https://schema.org/VegetarianDiet',
  'gluten-free': 'https://schema.org/GlutenFreeDiet',
}

/** Exact nutrition disclaimer required on every recipe page. */
const NUTRITION_DISCLAIMER =
  'Nutrition is an estimate calculated from USDA FoodData Central ingredient data and may vary by ingredient brand, preparation, and portion size.'

/** Positive badge shown only for recipes genuinely cooked in our kitchen. */
const KITCHEN_TESTED_BADGE = 'Tested in our kitchen'

function buildRecipeLd(recipe, canonical) {
  const nutrition = {}
  Object.entries(recipe.nutrition).forEach(([key, v]) => {
    const field = NUTRITION_MAP[key]
    if (field && v) nutrition[field] = key === 'calories' ? `${v.amount} calories` : `${v.amount} ${v.unit}`
  })
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    image: [absImage(recipe.image)],
    description: recipe.description,
    author: { '@type': 'Organization', name: 'The Recipe Seeker', url: absUrl('/') },
    datePublished: recipe.datePublished,
    dateModified: recipe.dateModified,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    totalTime: recipe.totalTime,
    recipeYield: `${recipe.servings} servings`,
    recipeCategory: recipe.tags.meals.join(', '),
    recipeCuisine: recipe.cuisine,
    keywords: [...recipe.tags.nutrients, ...recipe.tags.diets, ...recipe.tags.meals].join(', '),
    recipeIngredient: recipe.ingredients.map((i) => `${i.amount} ${i.item}`.trim()),
    recipeInstructions: recipe.steps.map((s, i) => ({
      '@type': 'HowToStep',
      name: s.title,
      text: s.text,
      url: `${canonical}#step-${i + 1}`,
    })),
    nutrition: { '@type': 'NutritionInformation', servingSize: '1 serving', ...nutrition },
    suitableForDiet: recipe.tags.diets.map((d) => DIET_MAP[d.toLowerCase()]).filter(Boolean),
    // Only real, signed-in ratings, only once there are enough, and the same
    // numbers are shown on the page by RatingWidget (Google's requirement).
    ...(recipe.ratingStats?.rating_count >= 5 && recipe.ratingStats.rating_avg != null
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(recipe.ratingStats.rating_avg),
            ratingCount: recipe.ratingStats.rating_count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  }
}

function Stat({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mist text-ink">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-xs font-medium uppercase tracking-wider text-ink/55">{label}</span>
        <span className="font-display text-lg font-bold text-ink">{value}</span>
      </span>
    </div>
  )
}

/** Key nutrient tiles: big number + %DV meter in the nutrient's color. */
function AtAGlance({ recipe }) {
  const items = recipe.keyNutrients
    .map((b) => {
      const key = b.key || b.id
      const data = recipe.nutrition[key]
      return data ? { key, data, hub: getNutrient(key), meta: nutrientMeta(key) } : null
    })
    .filter(Boolean)
    .slice(0, 4)
  if (!items.length) return null
  return (
    <section aria-labelledby="glance-heading" className="mt-10">
      <h2 id="glance-heading" className="sr-only">Key nutrients per serving</h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map(({ key, data, hub, meta }) => {
          const pct = Math.round(data.dv || 0)
          const inner = (
            <>
              <span className="flex items-center justify-between text-sm font-semibold text-ink/70">
                {hub ? hub.name : meta.short}
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden="true" />
              </span>
              <span className="mt-2 block font-display text-3xl font-extrabold text-ink sm:text-4xl">
                {formatAmount(data.amount, data.unit)}
              </span>
              <span className="mt-3 block h-2 overflow-hidden rounded-full bg-card/70">
                <span className="block h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: meta.color }} />
              </span>
              <span className="mt-1.5 block text-xs font-medium text-ink/60">{pct}% of daily value</span>
            </>
          )
          return (
            <li key={key}>
              {hub ? (
                <Link
                  to={`/nutrients/${hub.slug || hub.key}`}
                  className="block h-full rounded-3xl p-4 hover:-translate-y-0.5 sm:p-5"
                  style={{ backgroundColor: tint(meta.color, 0.12) }}
                  aria-label={`${formatAmount(data.amount, data.unit)} ${hub.name}, ${pct}% daily value. Learn about ${hub.name}`}
                >
                  {inner}
                </Link>
              ) : (
                <div className="h-full rounded-3xl p-4 sm:p-5" style={{ backgroundColor: tint(meta.color, 0.12) }}>
                  {inner}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Ingredients({ recipe, onToast }) {
  const list = useShoppingList()
  const [servings, setServings] = useState(recipe.servings)
  const [checked, setChecked] = useState(() => new Set())
  const [copied, setCopied] = useState(false)
  const factor = servings / recipe.servings

  const toggle = (i) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  const copyAll = async () => {
    const text =
      `Shopping list: ${recipe.title} (${servings} servings)\n` +
      recipe.ingredients.map((i) => `• ${scaleAmount(i.amount, factor)} ${i.item}`.trim()).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  const addToList = () => {
    const wasOnList = list.has(recipe.slug)
    list.addRecipe({
      slug: recipe.slug,
      title: recipe.title,
      servings,
      items: recipe.ingredients.map((i) => ({ amount: scaleAmount(i.amount, factor), item: i.item })),
    })
    onToast({ text: wasOnList ? `Shopping list updated (${servings} servings)` : 'Added to your shopping list', to: '/shopping-list', link: 'View list' })
  }

  return (
    <section aria-labelledby="ingredients-heading" id="ingredients" className="scroll-mt-24 rounded-3xl border border-line bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="ingredients-heading" className="font-display text-2xl font-bold text-ink">Ingredients</h2>
        <div className="no-print flex items-center gap-1 rounded-full bg-mist p-1" role="group" aria-label="Adjust servings">
          <button
            type="button"
            onClick={() => setServings((s) => Math.max(1, s - 1))}
            disabled={servings <= 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-card text-ink shadow-sm disabled:opacity-40"
            aria-label="Fewer servings"
          >
            <Icon name="minus" className="h-4 w-4" strokeWidth={2.4} />
          </button>
          <span className="min-w-[4.5rem] text-center text-sm font-semibold tabular-nums text-ink" aria-live="polite">
            {servings} serving{servings === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={() => setServings((s) => Math.min(24, s + 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-card text-ink shadow-sm"
            aria-label="More servings"
          >
            <Icon name="plus" className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </div>
      </div>
      {factor !== 1 && (
        <p className="no-print mt-2 text-xs text-ink/55">
          Amounts scaled from the original {recipe.servings} servings. Nutrition stays per serving.
        </p>
      )}
      <ul className="mt-4 space-y-0.5">
        {recipe.ingredients.map((ing, i) => {
          const amount = scaleAmount(ing.amount, factor)
          return (
            <li key={i}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-mist">
                <input
                  type="checkbox"
                  checked={checked.has(i)}
                  onChange={() => toggle(i)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#1F7A4A]"
                  aria-label={`${amount} ${ing.item}`}
                />
                <span className={`text-[15px] leading-snug ${checked.has(i) ? 'text-ink/40 line-through' : 'text-ink/85'}`}>
                  <strong className="font-semibold text-ink">{amount}</strong> {ing.item}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      <div className="no-print mt-4 grid gap-2">
        <button
          type="button"
          onClick={addToList}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-paper hover:bg-leaf-dark"
        >
          <Icon name="list" className="h-4 w-4" />
          {list.has(recipe.slug) ? 'Update shopping list' : 'Add to shopping list'}
        </button>
        <button
          type="button"
          onClick={copyAll}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-line px-5 text-sm font-semibold text-ink hover:border-ink/30"
        >
          <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4" />
          {copied ? 'Copied to clipboard!' : 'Copy ingredients'}
        </button>
      </div>
    </section>
  )
}

export default function RecipePage() {
  const { slug } = useParams()
  const summary = getRecipe(slug)
  // Full recipe (ingredients, steps, FAQs): embedded in the prerendered page,
  // fetched on client-side navigation. The summary renders immediately.
  const { data: detail, error: detailError } = useDetail('recipes', slug)
  const recipe = useMemo(() => (summary && detail ? { ...summary, ...detail } : summary), [summary, detail])
  const ready = Boolean(summary && detail)
  const [cooking, setCooking] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (summary) rememberRecipe(summary.slug)
  }, [summary])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const related = useMemo(() => {
    if (!summary) return []
    const score = (r) => r.tags.nutrients.filter((n) => summary.tags.nutrients.includes(n)).length
    return recipes
      .filter((r) => r.slug !== summary.slug && score(r) > 0)
      .sort((a, b) => score(b) - score(a))
      .slice(0, 3)
  }, [summary])

  if (!recipe) {
    return (
      <>
        <Seo title="Recipe not found | The Recipe Seeker" description="This recipe could not be found." canonical={absUrl('/recipes/')} noindex />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <h1 className="font-display text-4xl font-extrabold text-ink">Recipe not found</h1>
          <p className="mt-4 text-ink/70">We couldn’t find that recipe. Try browsing the collection instead.</p>
          <Link to="/recipes" className="mt-6 inline-flex min-h-[48px] items-center rounded-full bg-ink px-6 font-semibold text-paper">Browse recipes</Link>
        </div>
      </>
    )
  }

  const canonical = absUrl(`/recipes/${recipe.slug}`)
  const topBadge = recipe.keyNutrients[0]?.label || ''
  const title = `${recipe.title} (${topBadge}) | The Recipe Seeker`
  const hook = ` ${topBadge} per serving, with full nutrition facts and % daily values.`
  const description = (recipe.description + hook).slice(0, 160)

  const recipeLd = ready ? buildRecipeLd(recipe, canonical) : null
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Recipes', item: absUrl('/recipes') },
      { '@type': 'ListItem', position: 3, name: recipe.title, item: canonical },
    ],
  }
  const faqLd = ready && {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: recipe.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const eyebrow = [...recipe.tags.meals.map((m) => MEAL_LABELS[m] || m), ...recipe.tags.diets.map((d) => DIET_LABELS[d] || d)]

  const slot = slotFor(recipe)
  const slotLabel = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', snacks: 'snacks' }[slot]
  const planIt = () => {
    addToDay(recipe.slug, slot)
    setToast({ text: `Added to today’s ${slotLabel}`, to: '/day-builder', link: 'Open planner' })
  }
  const share = async () => {
    const data = { title: recipe.title, text: `${recipe.title}: ${recipe.description}`, url: canonical }
    try {
      if (navigator.share) await navigator.share(data)
      else {
        await navigator.clipboard.writeText(canonical)
        setToast({ text: 'Link copied to clipboard' })
      }
    } catch {
      /* share sheet dismissed */
    }
  }
  const pinMedia = pins.recipes.includes(recipe.slug) ? absUrl(`/pins/recipes/${recipe.slug}.jpg`) : absImage(recipe.image)
  const pinUrl = `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(canonical)}&media=${encodeURIComponent(
    pinMedia,
  )}&description=${encodeURIComponent(`${recipe.title} (${topBadge} per serving)`)}`

  return (
    <>
      <Seo
        title={title}
        description={description}
        canonical={canonical}
        image={absImage(recipe.image)}
        type="article"
        publishedTime={recipe.datePublished}
        modifiedTime={recipe.dateModified}
      />
      <JsonLd data={ready ? [recipeLd, breadcrumbLd, faqLd] : [breadcrumbLd]} />

      <article className="mx-auto max-w-7xl px-4 pb-8 pt-4 sm:px-6 sm:pt-6">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Recipes', to: '/recipes' }, { label: recipe.title }]} />

        {/* HERO */}
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <Reveal variant="scale" immediate className="order-2 lg:order-1">
            <div className="relative overflow-hidden rounded-[2rem] bg-mist">
              <ResponsiveImage
                src={recipe.image}
                alt={recipe.imageAlt}
                width={1200}
                height={900}
                fetchPriority="high"
                sizes="(max-width: 1024px) 100vw, 640px"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </Reveal>

          <div className="order-1 lg:order-2">
            <Reveal immediate variant="up" className="flex flex-wrap gap-2">
              {eyebrow.map((t) => (
                <span key={t} className="rounded-full bg-mist px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink/70">{t}</span>
              ))}
            </Reveal>
            <Reveal as="h1" immediate variant="up" delay={60} className="mt-4 font-display text-4xl font-extrabold leading-[1.04] text-ink sm:text-5xl lg:text-[3.4rem]">
              {recipe.title}
            </Reveal>
            <Reveal as="p" immediate variant="up" delay={120} className="mt-4 text-lg leading-relaxed text-ink/70">
              {recipe.description}
            </Reveal>

            {recipe.kitchenTested === true && (
              <Reveal immediate variant="up" delay={140} className="mt-4">
                <p className="inline-flex items-center gap-2 rounded-full bg-leaf-soft px-4 py-2 text-sm font-semibold text-leaf-dark" role="note">
                  <Icon name="check" className="h-4 w-4" strokeWidth={2.6} /> {KITCHEN_TESTED_BADGE}
                </p>
              </Reveal>
            )}

            <Reveal immediate variant="up" delay={180} className="mt-6 flex flex-wrap gap-2">
              {recipe.keyNutrients.map((b) => {
                const key = b.key || b.id
                const n = getNutrient(key)
                return <NutrientBadge key={key} label={b.label} nutrientKey={key} to={n ? `/nutrients/${n.slug || n.key}` : undefined} />
              })}
            </Reveal>

            <Reveal immediate variant="up" delay={220} className="no-print mt-7 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setCooking(true)}
                disabled={!ready}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-bold text-paper hover:bg-leaf-dark disabled:opacity-50"
              >
                <Icon name="chef" className="h-5 w-5" /> Start cook mode
              </button>
              <FavoriteButton slug={recipe.slug} title={recipe.title} className="min-h-[48px]" />
              <button
                type="button"
                onClick={planIt}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-line bg-card px-5 text-sm font-semibold text-ink hover:border-ink/30"
              >
                <Icon name="calendar" className="h-4 w-4" /> Add to plan
              </button>
            </Reveal>
            <Reveal immediate variant="up" delay={260} className="no-print mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-ink/70">
              <a href="#ingredients" className="inline-flex min-h-[36px] items-center gap-1.5 hover:text-ink">
                <Icon name="arrowDown" className="h-4 w-4" /> Jump to recipe
              </a>
              <button type="button" onClick={share} className="inline-flex min-h-[36px] items-center gap-1.5 hover:text-ink">
                <Icon name="share" className="h-4 w-4" /> Share
              </button>
              <a href={pinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[36px] items-center gap-1.5 hover:text-[#E60023]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.7 1.3 1.4 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.9 1.6 1.9 1.9 0 3.3-2 3.3-4.9 0-2.6-1.8-4.4-4.5-4.4-3 0-4.8 2.3-4.8 4.6 0 .9.4 1.9.8 2.4l.1.4-.3 1.2c0 .2-.2.3-.4.2-1.3-.6-2.2-2.6-2.2-4.2 0-3.4 2.5-6.5 7.1-6.5 3.7 0 6.6 2.7 6.6 6.2 0 3.7-2.3 6.6-5.6 6.6-1.1 0-2.1-.6-2.5-1.2l-.7 2.6c-.2 1-.9 2.2-1.4 2.9A10 10 0 1 0 12 2z" />
                </svg>
                Pin it
              </a>
            </Reveal>
          </div>
        </div>

        {/* STATS */}
        <Reveal variant="up" className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon="clock" label="Prep" value={`${recipe.prepMinutes} min`} />
          <Stat icon="flame" label="Cook" value={`${recipe.cookMinutes} min`} />
          <Stat icon="bolt" label="Calories" value={formatAmount(recipe.calories, 'kcal')} />
          <Stat icon="users" label="Serves" value={`${recipe.servings}`} />
        </Reveal>

        <AtAGlance recipe={recipe} />

        <div className="mt-8 max-w-xl">
          <AuthorByline compact date={recipe.dateModified ? `Updated ${recipe.dateModified}` : undefined} />
        </div>

        {/* BODY */}
        {ready ? (
          <>
        <div className="mt-12 grid gap-10 lg:grid-cols-[380px_1fr] lg:gap-14">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Ingredients key={recipe.slug} recipe={recipe} onToast={setToast} />
            <div className="no-print mt-3 flex justify-center">
              <PrintButton label="Print recipe" />
            </div>
          </div>

          <div className="min-w-0">
            <section aria-labelledby="instructions-heading">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="instructions-heading" className="font-display text-3xl font-extrabold text-ink">Instructions</h2>
                  <p className="mt-1 text-sm text-ink/60">
                    {recipe.steps.length} steps · about {recipe.totalMinutes} minutes total
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCooking(true)}
                  className="no-print inline-flex min-h-[44px] items-center gap-2 rounded-full bg-zest px-5 text-sm font-bold text-ink hover:brightness-95"
                >
                  <Icon name="chef" className="h-4 w-4" /> Cook mode
                </button>
              </div>
              <ol className="mt-6 space-y-4">
                {recipe.steps.map((step, i) => (
                  <li key={i} id={`step-${i + 1}`} className="scroll-mt-28 rounded-3xl border border-line bg-card p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <span className="font-display text-4xl font-extrabold leading-none text-leaf" aria-hidden="true">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-display text-xl font-bold text-ink">{step.title}</h3>
                        <p className="mt-2 leading-relaxed text-ink/75">{step.text}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <Reveal variant="up" as="section" aria-labelledby="why-heading" className="relative mt-12 overflow-hidden rounded-[2rem] bg-ink px-6 py-9 text-paper sm:px-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-zest">Why this helps</p>
              <h2 id="why-heading" className="mt-2 font-display text-3xl font-extrabold">
                {recipe.whyItHelps.goal}
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-paper/80">{recipe.whyItHelps.text}</p>
              <div className="no-print mt-6 flex flex-wrap gap-2.5">
                {recipe.keyNutrients.map((b) => {
                  const n = getNutrient(b.key || b.id)
                  return n ? (
                    <Link key={b.key || b.id} to={`/nutrients/${n.slug || n.key}`} className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-paper/10 px-4 text-sm font-semibold text-paper hover:bg-paper/20">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: nutrientMeta(n.key).color }} aria-hidden="true" />
                      All about {n.name}
                    </Link>
                  ) : null
                })}
              </div>
            </Reveal>

            <div className="mt-12">
              <NutritionTable nutrition={recipe.nutrition} servings={recipe.servings} />
              <p className="mt-3 text-xs leading-relaxed text-ink/55">{NUTRITION_DISCLAIMER}</p>
            </div>

            <section aria-labelledby="faq-heading" className="mt-12">
              <h2 id="faq-heading" className="font-display text-3xl font-extrabold text-ink">Questions, answered</h2>
              <div className="mt-6">
                <FaqAccordion faqs={recipe.faqs} idPrefix={`faq-${recipe.slug}`} />
              </div>
            </section>

            <div className="mt-10">
              <RatingWidget slug={recipe.slug} title={recipe.title} initialStats={recipe.ratingStats || null} />
            </div>
          </div>
        </div>

          </>
        ) : (
          <div className="mt-12 grid gap-10 lg:grid-cols-[380px_1fr] lg:gap-14" aria-busy={!detailError}>
            {detailError ? (
              <div className="rounded-3xl border border-line bg-card p-6 lg:col-span-2">
                <p className="font-display text-xl font-bold text-ink">We couldn’t load the full recipe.</p>
                <p className="mt-2 text-ink/65">Check your connection, then try again.</p>
                <a href={`/recipes/${slug}`} className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-ink px-5 text-sm font-bold text-paper">
                  Reload recipe
                </a>
              </div>
            ) : (
              <>
                <div className="h-96 animate-pulse rounded-3xl bg-mist" />
                <div className="space-y-4">
                  {[0, 1, 2].map((k) => (
                    <div key={k} className="h-28 animate-pulse rounded-3xl bg-mist" />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="no-print mt-20">
            <SectionHeading
              id="related-heading"
              eyebrow="Same nutrients, different dish"
              title="You might also like"
              action={
                <Link to="/recipes" className="inline-flex items-center gap-1.5 font-semibold text-ink hover:text-leaf-dark">
                  All recipes <Icon name="arrowRight" className="h-4 w-4" />
                </Link>
              }
            />
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r, i) => (
                <Reveal key={r.slug} variant="up" delay={Math.min(i * 80, 240)}>
                  <RecipeCard recipe={r} />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        <div className="mt-12">
          <MedicalDisclaimer />
        </div>
        <p className="print-url hidden">{canonical}</p>
      </article>

      {ready && <CookMode recipe={recipe} open={cooking} onClose={() => setCooking(false)} />}

      <div aria-live="polite" className="no-print pointer-events-none fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-6">
        {toast && (
          <div className="pop-in pointer-events-auto flex items-center gap-4 rounded-full bg-ink py-2 pl-5 pr-2 text-sm font-semibold text-paper shadow-[var(--shadow-lift)]">
            <span className="flex items-center gap-2">
              <Icon name="check" className="h-4 w-4 text-zest" strokeWidth={2.6} /> {toast.text}
            </span>
            {toast.to ? (
              <Link to={toast.to} className="inline-flex min-h-[36px] items-center rounded-full bg-zest px-4 font-bold text-ink">
                {toast.link}
              </Link>
            ) : (
              <span className="w-2" />
            )}
          </div>
        )}
      </div>
    </>
  )
}
