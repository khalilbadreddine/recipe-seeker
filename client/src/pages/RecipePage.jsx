import React, { useMemo, useState } from 'react'
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
import Reveal, { Parallax } from '../components/Reveal'
import {
  absUrl, absImage, getRecipe, getNutrient, recipes, formatAmount,
} from '../data/site'

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

const DIET_MAP = {
  Vegan: 'https://schema.org/VeganDiet',
  Vegetarian: 'https://schema.org/VegetarianDiet',
  'Gluten-Free': 'https://schema.org/GlutenFreeDiet',
  'Low-Carb': 'https://schema.org/LowCalorieDiet',
}

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
    suitableForDiet: recipe.tags.diets.map((d) => DIET_MAP[d]).filter(Boolean),
  }
}

function StatCard({ label, value, icon }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-forest-line bg-cream-card px-4 py-5 text-center shadow-sm">
      <span className="flex items-center gap-1.5 text-sm font-medium text-forest/80">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-ember" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d={icon} />
        </svg>
        {label}
      </span>
      <span className="mt-1 font-display text-2xl font-semibold text-forest">{value}</span>
    </div>
  )
}

const STAT_ICONS = {
  prep: 'M12 8v4l2.5 2.5M12 21a9 9 0 100-18 9 9 0 000 18z',
  cook: 'M4 11h16v2a8 8 0 01-8 8h-2a6 6 0 01-6-6v-4zM12 3v4M8 5l1 2M16 5l-1 2',
  kcal: 'M12 3c2.5 3.5 5 6 5 9.5a5 5 0 11-10 0C7 9 9.5 6.5 12 3z',
  serves: 'M5 8h14l-1.5 12a2 2 0 01-2 1.8h-7A2 2 0 017.5 20L6 8zM8 8V6a4 4 0 018 0v2',
}

function Ingredients({ recipe }) {
  const [checked, setChecked] = useState(() => new Set())
  const [copied, setCopied] = useState(false)

  const toggle = (i) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const copyAll = async () => {
    const text = `Shopping list - ${recipe.title}\n` +
      recipe.ingredients.map((i) => `• ${i.amount} ${i.item}`.trim()).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section aria-labelledby="ingredients-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="ingredients-heading" className="font-display text-3xl font-semibold text-forest">Ingredients</h2>
          <p className="mt-1 text-sm text-forest/75">
            {recipe.ingredients.length} ingredients · adjust for {recipe.servings} servings
          </p>
        </div>
        <PrintButton className="w-full justify-center sm:w-auto" />
      </div>
      <ul className="mt-4 space-y-1">
        {recipe.ingredients.map((ing, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-forest-soft/60">
              <input
                type="checkbox"
                checked={checked.has(i)}
                onChange={() => toggle(i)}
                className="mt-1 h-5 w-5 shrink-0 accent-[#1E4633]"
                aria-label={`${ing.amount} ${ing.item}`}
              />
              <span className={`text-[15px] ${checked.has(i) ? 'text-forest/45 line-through' : 'text-forest/90'}`}>
                <strong className="font-semibold">{ing.amount}</strong> {ing.item}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={copyAll}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-ember px-5 py-2.5 text-sm font-semibold text-ember-dark transition hover:bg-ember-dark hover:text-white"
      >
        <span aria-hidden="true">{copied ? '✓' : '+'}</span>
        {copied ? 'Copied to clipboard!' : 'Add all ingredients to shopping list'}
      </button>
    </section>
  )
}

export default function RecipePage() {
  const { slug } = useParams()
  const recipe = getRecipe(slug)

  const related = useMemo(() => {
    if (!recipe) return []
    return recipes
      .filter((r) => r.slug !== recipe.slug && r.tags.nutrients.some((n) => recipe.tags.nutrients.includes(n)))
      .slice(0, 3)
  }, [recipe])

  if (!recipe) {
    return (
      <>
        <Seo title="Recipe not found | The Recipe Seeker" description="This recipe could not be found." canonical={absUrl('/recipes/')} noindex />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h1 className="font-display text-4xl font-semibold text-forest">Recipe not found</h1>
          <p className="mt-4 text-forest/80">We couldn’t find that recipe. Try browsing the collection instead.</p>
          <Link to="/search" className="mt-6 inline-block rounded-full bg-ember-dark px-6 py-3 font-semibold text-white shadow-sm transition hover:shadow-md">Search Recipes</Link>
        </div>
      </>
    )
  }

  const canonical = absUrl(`/recipes/${recipe.slug}`)
  const topBadge = recipe.keyNutrients[0]?.label || ''
  const title = `${recipe.title} (${topBadge}) | The Recipe Seeker`
  const hook = ` ${topBadge} per serving, with full nutrition facts and % daily values.`
  const description = (recipe.description + hook).slice(0, 160)

  const recipeLd = buildRecipeLd(recipe, canonical)
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Recipes', item: absUrl('/#recipes') },
      { '@type': 'ListItem', position: 3, name: recipe.title, item: canonical },
    ],
  }
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: recipe.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

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
      <JsonLd data={[recipeLd, breadcrumbLd, faqLd]} />

      <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link to="/#recipes" className="inline-flex items-center gap-1 text-[15px] font-medium text-ember-dark underline decoration-ember/50 underline-offset-4 hover:text-ember">
          <span aria-hidden="true">←</span> Back to Recipes
        </Link>

        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Recipes', to: '/#recipes' }, { label: recipe.title }]} />

        <Reveal as="h1" immediate variant="up" className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-tight text-forest sm:text-5xl">
          {recipe.title}
        </Reveal>
        <Reveal as="p" immediate variant="up" delay={90} className="mt-4 max-w-3xl text-lg leading-relaxed text-forest/75">{recipe.description}</Reveal>

        <Reveal immediate variant="up" delay={130} className="mt-5">
          <FavoriteButton slug={recipe.slug} title={recipe.title} />
        </Reveal>

        <Reveal immediate variant="up" delay={180} className="mt-6 flex flex-wrap gap-3">
          {recipe.keyNutrients.map((b) => {
            const n = getNutrient(b.key || b.id)
            return <NutrientBadge key={b.key || b.id} label={b.label} variant="outline" to={n ? `/nutrients/${n.slug || n.key}` : undefined} />
          })}
          {recipe.tags.diets.map((d) => (
            <NutrientBadge key={d} label={d} variant="outline" />
          ))}
        </Reveal>

        <Reveal variant="fade" delay={240} className="mt-8 max-w-3xl">
          <AuthorByline />
        </Reveal>

        <Reveal variant="scale" className="mt-8">
          <div className="overflow-hidden rounded-[2rem] shadow-[0_24px_60px_rgba(30,70,51,0.18)]">
            <Parallax speed={0.08} className="aspect-[16/10] w-full">
              <ResponsiveImage
                src={recipe.image}
                alt={recipe.imageAlt}
                width={1200}
                height={800}
                fetchPriority="high"
                sizes="100vw"
                className="h-full w-full scale-[1.15] object-cover"
              />
            </Parallax>
          </div>
        </Reveal>

        <Reveal variant="up" className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Prep Time" value={`${recipe.prepMinutes} mins`} icon={STAT_ICONS.prep} />
          <StatCard label="Cook Time" value={`${recipe.cookMinutes} mins`} icon={STAT_ICONS.cook} />
          <StatCard label="Calories" value={formatAmount(recipe.calories, 'kcal')} icon={STAT_ICONS.kcal} />
          <StatCard label="Serves" value={`${recipe.servings} servings`} icon={STAT_ICONS.serves} />
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <Reveal variant="up">
            <Ingredients recipe={recipe} />
          </Reveal>
          <Reveal variant="up" delay={120}>
            <NutritionTable nutrition={recipe.nutrition} servings={recipe.servings} />
          </Reveal>
        </div>

        <Reveal variant="up" as="section" aria-labelledby="instructions-heading" className="mt-14">
          <h2 id="instructions-heading" className="font-display text-3xl font-semibold text-forest">Instructions</h2>
          <p className="mt-1 text-sm text-forest/75">
            {recipe.steps.length} steps · ~{recipe.totalMinutes} minutes total
          </p>
          <ol className="mt-6 space-y-7">
            {recipe.steps.map((step, i) => (
              <li key={i} id={`step-${i + 1}`} className="scroll-mt-28 rounded-2xl border border-forest-line bg-cream-card p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ember-dark font-display text-lg font-bold text-white" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-forest">{step.title}</h3>
                    <p className="mt-2 leading-relaxed text-forest/80">{step.text}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-forest/75">Source: {recipe.source}</p>
        </Reveal>

        <Reveal variant="up" as="section" aria-labelledby="why-heading" className="mt-14 rounded-[2rem] bg-forest px-6 py-10 text-cream sm:px-10">
          <h2 id="why-heading" className="font-display text-3xl font-semibold">
            Why this helps {recipe.whyItHelps.goal}
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-cream/85">{recipe.whyItHelps.text}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {recipe.keyNutrients.map((b) => {
              const n = getNutrient(b.key || b.id)
              return n ? (
                <Link key={b.key || b.id} to={`/nutrients/${n.slug || n.key}`} className="rounded-full bg-cream/15 px-4 py-2 text-sm font-semibold text-cream transition hover:bg-cream/25">
                  Learn about {n.name} →
                </Link>
              ) : null
            })}
          </div>
        </Reveal>

        <Reveal variant="up" as="section" aria-labelledby="faq-heading" className="mt-14">
          <h2 id="faq-heading" className="font-display text-3xl font-semibold text-forest">
            Frequently asked questions
          </h2>
          <div className="mt-6">
            <FaqAccordion faqs={recipe.faqs} idPrefix={`faq-${recipe.slug}`} />
          </div>
        </Reveal>

        <div className="mt-10">
          <RatingWidget slug={recipe.slug} title={recipe.title} />
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-14">
            <Reveal variant="up" className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
              <h2 id="related-heading" className="font-display text-3xl font-semibold text-forest">You Might Also Like</h2>
              <Link to="/search" className="font-medium text-ember-dark hover:text-ember">Search Recipes →</Link>
            </Reveal>
            <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r, i) => (
                <Reveal key={r.slug} variant="up" delay={Math.min(i * 80, 240)}>
                  <RecipeCard recipe={r} badgeVariant="outline" />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        <div className="mt-12">
          <MedicalDisclaimer />
        </div>
      </article>
    </>
  )
}
