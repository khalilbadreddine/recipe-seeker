/**
 * Recipe matching for the "Ask Seeker" chat.
 *
 * Shared by the serverless function (api/chat.mjs, which grounds the LLM in
 * these matches) and the browser (offline fallback when the API is
 * unavailable). Pure functions, no imports: pass the site data in.
 *
 * It reads a free-text question for nutrients, diets, meals, a time limit,
 * excluded ingredients and keywords, then ranks recipes. Diet tags and
 * exclusions are hard filters (never suggest meat to a vegetarian); the
 * time limit is relaxed only when nothing fits.
 */

const NUTRIENT_WORDS = {
  iron: ['iron', 'anemia', 'anaemia', 'ferritin'],
  protein: ['protein'],
  fiber: ['fiber', 'fibre'],
  vitaminC: ['vitamin c', 'vit c'],
  calcium: ['calcium'],
  magnesium: ['magnesium'],
  vitaminD: ['vitamin d', 'vit d'],
  b12: ['b12', 'b-12', 'b 12'],
  zinc: ['zinc'],
  folate: ['folate', 'folic'],
  potassium: ['potassium'],
  omega3: ['omega', 'dha', 'epa'],
}

const DIET_WORDS = {
  vegan: ['vegan', 'plant-based', 'plant based'],
  vegetarian: ['vegetarian', 'veggie', 'meatless', 'meat-free', 'meat free', 'no meat'],
  pescatarian: ['pescatarian', 'pescetarian'],
  'gluten-free': ['gluten-free', 'gluten free', 'no gluten', 'celiac', 'coeliac'],
  'dairy-free': ['dairy-free', 'dairy free', 'no dairy', 'lactose'],
  'low-carb': ['low-carb', 'low carb', 'keto'],
}

const MEAL_WORDS = {
  breakfast: ['breakfast', 'morning'],
  brunch: ['brunch'],
  lunch: ['lunch', 'lunchbox'],
  dinner: ['dinner', 'supper', 'tonight', 'weeknight'],
  snack: ['snack', 'snacks'],
  dessert: ['dessert', 'sweet treat', 'treat'],
}

/** Ingredient families for "no fish", "without nuts", "nut-free"… */
const FAMILIES = {
  fish: ['salmon', 'tuna', 'cod', 'sardine', 'mackerel', 'trout', 'anchov', 'fish'],
  seafood: ['shrimp', 'prawn', 'salmon', 'tuna', 'cod', 'sardine', 'mackerel', 'fish'],
  meat: ['chicken', 'beef', 'turkey', 'pork', 'lamb', 'bacon', 'ham'],
  chicken: ['chicken'],
  beef: ['beef'],
  pork: ['pork', 'bacon', 'ham'],
  dairy: ['milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'parmesan', 'feta', 'cheddar', 'mozzarella', 'ricotta', 'cottage'],
  cheese: ['cheese', 'parmesan', 'feta', 'cheddar', 'mozzarella', 'ricotta', 'cottage'],
  egg: ['egg'],
  eggs: ['egg'],
  nut: ['almond', 'walnut', 'cashew', 'pecan', 'peanut', 'pine nut', 'pistachio', 'hazelnut'],
  nuts: ['almond', 'walnut', 'cashew', 'pecan', 'peanut', 'pine nut', 'pistachio', 'hazelnut'],
  soy: ['soy', 'tofu', 'tempeh', 'edamame', 'miso'],
  gluten: ['pasta', 'bread', 'flour', 'penne', 'spaghetti', 'tortilla', 'couscous', 'farro', 'barley'],
}

const STOP = new Set(
  `a an the and or but with without for to of in on at by from my me i we you your is are be do does did can could should would
  what which who how much many some any more most less lot lots good best great easy simple healthy high rich low recipe recipes
  meal meals food foods dish dishes idea ideas want need like make cook cooking eat eating give show find get have has please
  something anything per serving servings day daily today tonight week minutes minute mins min quick fast under than about
  around that this these those it its also just really very tasty yummy delicious ok okay hi hello thanks thank
  quicker faster shorter ones one other others another else instead different option options alternative alternatives
  make made version same kind type sort what about how but only too also maybe
  email send tell know help suggest recommend recommendation looking search`.split(/\s+/),
)

const has = (text, phrase) => new RegExp(`(^|[^a-z0-9])${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(text)

/** Parse a question into structured intent. */
export function parseIntent(question) {
  const q = ` ${String(question || '').toLowerCase()} `
  const pick = (map) => Object.keys(map).filter((k) => map[k].some((w) => has(q, w)))

  const nutrients = pick(NUTRIENT_WORDS)
  const diets = pick(DIET_WORDS)
  const meals = pick(MEAL_WORDS)

  let maxTime = 0
  const t = q.match(/(?:under|less than|within|in|<|max|maximum)\s*(\d{1,3})\s*(?:-|\s)?(?:min|mins|minutes)\b/)
  if (t) maxTime = Number(t[1])
  else if (/\b(quick|quicker|fast|faster|speedy|in a hurry|rushed)\b/.test(q)) maxTime = 30

  const excluded = new Set()
  const excludedWords = new Set()
  for (const m of q.matchAll(/\b(?:no|without|avoid|avoiding|not|hate|allergic to)\s+([a-z-]+)/g)) {
    const word = m[1].replace(/-free$/, '')
    excludedWords.add(word)
    ;(FAMILIES[word] || (word.length > 2 && !STOP.has(word) ? [word.replace(/s$/, '')] : [])).forEach((x) => excluded.add(x))
  }
  for (const m of q.matchAll(/\b([a-z]+)-free\b/g)) {
    excludedWords.add(m[1])
    ;(FAMILIES[m[1]] || []).forEach((x) => excluded.add(x))
  }
  if (diets.includes('dairy-free')) FAMILIES.dairy.forEach((x) => excluded.add(x))

  const claimed = new Set(
    [...Object.values(NUTRIENT_WORDS), ...Object.values(DIET_WORDS), ...Object.values(MEAL_WORDS)].flat().flatMap((w) => w.split(/[\s-]/)),
  )
  const keywords = [
    ...new Set(
      q
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/[\s-]+/)
        .filter((w) => w.length > 2 && !STOP.has(w) && !claimed.has(w) && !excludedWords.has(w) && w !== 'free' && !/^\d+$/.test(w))
        .map((w) => (w.length > 4 ? w.replace(/(es|s)$/, '') : w)),
    ),
  ].filter((w) => ![...excluded].some((x) => x.startsWith(w) || w.startsWith(x)))

  return { nutrients, diets, meals, maxTime, excluded: [...excluded], keywords }
}

const dietOk = (recipe, diet) => {
  const d = recipe.tags?.diets || []
  if (diet === 'vegetarian') return d.includes('vegetarian') || d.includes('vegan')
  return d.includes(diet)
}

// Full recipes carry ingredients[]; the slim client index carries ingredientNames[].
const ingredientText = (r) => (r.ingredients ? r.ingredients.map((i) => i.item) : r.ingredientNames || []).join(' | ').toLowerCase()

/**
 * Rank recipes for a question.
 * Returns { intent, recipes: [recipe…], hubs: [nutrient…], signal: boolean }.
 */
export function matchRecipes(question, data, limit = 6, overrides = {}) {
  const intent = { ...parseIntent(question), ...overrides }
  const all = data.recipes || []

  let pool = all.filter((r) => {
    const ing = ingredientText(r)
    return !intent.excluded.some((x) => ing.includes(x))
  })
  for (const diet of intent.diets) pool = pool.filter((r) => dietOk(r, diet))

  let mealRelaxed = false
  if (intent.meals.length) {
    const meals = pool.filter((r) => intent.meals.some((m) => (r.tags?.meals || []).includes(m)))
    if (meals.length) pool = meals
    else mealRelaxed = true
  }

  let timeRelaxed = false
  if (intent.maxTime) {
    const timed = pool.filter((r) => (r.totalMinutes || 0) <= intent.maxTime)
    if (timed.length) pool = timed
    else timeRelaxed = true
  }

  const scored = pool.map((r) => {
    let score = 0
    let hits = 0
    for (const k of intent.nutrients) score += Math.min(150, r.nutrition?.[k]?.dv || 0) / 12
    for (const m of intent.meals) if ((r.tags?.meals || []).includes(m)) score += 4
    const title = r.title.toLowerCase()
    const desc = (r.description || '').toLowerCase()
    const ing = ingredientText(r)
    for (const w of intent.keywords) {
      if (title.includes(w)) {
        score += 6
        hits++
      } else if (ing.includes(w)) {
        score += 3
        hits++
      } else if (desc.includes(w)) {
        score += 1.5
        hits++
      }
    }
    return { r, score, hits }
  })

  const hitCount = scored.filter((s) => s.hits > 0).length
  const keywordMode = intent.keywords.length > 0 && hitCount > 0
  const structured = intent.nutrients.length || intent.diets.length || intent.meals.length || intent.maxTime || intent.excluded.length
  const signal = Boolean(structured || keywordMode)
  // Named ingredients/dishes must appear, unless a vague word ("cozy") would leave a single result.
  const requireHits = keywordMode && (!structured || hitCount >= 2)

  const ranked = scored
    .filter((s) => (requireHits ? s.hits > 0 : true))
    .sort((a, b) => b.score - a.score || (a.r.totalMinutes || 0) - (b.r.totalMinutes || 0))
    .map((s) => s.r)

  const hubs = intent.nutrients.map((k) => (data.nutrients || []).find((n) => n.key === k)).filter(Boolean)
  return { intent, recipes: signal ? ranked.slice(0, limit) : [], hubs, signal, timeRelaxed, mealRelaxed }
}

const FOLLOW_UP = /^\s*(and|but|also|any|anything|make it|what about|how about|instead|without|no |only|something|more|less|same|another|other|quicker|faster|cheaper|easier)\b/i

/**
 * Match the latest question in the context of the conversation: short or
 * subject-less follow-ups ("any quicker ones?", "make it vegan", "without
 * nuts") are combined with the previous question. "Quicker/faster" tightens
 * the time limit of the previous request.
 */
export function matchConversation(userQuestions, data, limit = 6) {
  const qs = userQuestions.filter(Boolean)
  const last = qs[qs.length - 1] || ''
  const prev = qs[qs.length - 2]
  const own = parseIntent(last)
  const subjectless = !own.nutrients.length && !own.diets.length && !own.meals.length && !own.keywords.length
  const short = last.trim().split(/\s+/).length <= 4
  if (!prev || !(subjectless || short || FOLLOW_UP.test(last))) return matchRecipes(last, data, limit)

  const combined = parseIntent(`${prev} ${last}`)
  const overrides = {}
  if (/\b(quicker|faster|shorter|less time)\b/i.test(last)) {
    const before = parseIntent(prev).maxTime
    overrides.maxTime = before ? Math.max(10, Math.round((before * 2) / 3 / 5) * 5) : 30
  }
  if (own.maxTime && !overrides.maxTime) overrides.maxTime = own.maxTime
  return matchRecipes(`${prev} ${last}`, data, limit, { ...overrides, keywords: combined.keywords })
}

const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10))

/** One compact line per recipe, used as LLM grounding. */
export function recipeLine(r, focus = []) {
  const keys = [...new Set([...focus, ...(r.keyNutrients || []).map((k) => k.key || k.id)])].slice(0, 5)
  const nut = keys
    .map((k) => {
      const n = r.nutrition?.[k]
      return n ? `${fmt(n.amount)}${n.unit} ${k}${n.dv != null ? ` (${Math.round(n.dv)}% DV)` : ''}` : null
    })
    .filter(Boolean)
    .join(', ')
  const ing = (r.ingredients || []).slice(0, 7).map((i) => i.item.split(',')[0]).join(', ')
  return `- "${r.title}" | ${r.totalMinutes} min | ${r.calories} kcal | ${(r.tags?.meals || []).join('/')} | ${
    (r.tags?.diets || []).join(', ') || 'no diet tags'
  } | per serving: ${nut} | ingredients: ${ing}`
}

/** A friendly reply without an LLM, built from the match. */
export function basicReply({ intent, recipes, hubs, signal, timeRelaxed, mealRelaxed }) {
  if (!signal) {
    return 'Tell me what you’re after, like a nutrient (iron, protein, fiber…), a diet, a meal or an ingredient, and I’ll find recipes for it.'
  }
  if (!recipes.length) {
    return 'I couldn’t find a recipe that fits all of that yet. Try loosening one part of the request, for example the diet or an excluded ingredient.'
  }
  const diet = intent.diets.length ? `${intent.diets.join(', ')} ` : ''
  const parts = []
  if (intent.nutrients.length) parts.push(`rich in ${hubs.map((h) => h.name.toLowerCase()).join(' and ') || intent.nutrients.join(' and ')}`)
  if (intent.keywords.length && !intent.nutrients.length) parts.push(`with ${intent.keywords.join(', ')}`)
  if (intent.meals.length && !mealRelaxed) parts.push(`for ${intent.meals.map((m) => (m === 'snack' ? 'a snack' : m)).join(' or ')}`)
  if (intent.maxTime && !timeRelaxed) parts.push(`ready in ${intent.maxTime} minutes or less`)
  const noun = recipes.length === 1 ? 'recipe' : 'recipes'
  let text = `Here ${recipes.length === 1 ? 'is a' : 'are'} ${diet}${noun}${parts.length ? ` ${parts.join(', ')}` : ''} from our collection.`
  if (mealRelaxed) text += ` I don’t have a ${diet}${intent.meals.join(' or ')} recipe yet, so these are the closest matches.`
  if (timeRelaxed) text += ` None fit within ${intent.maxTime} minutes, so these are the quickest close matches.`
  for (const h of hubs) text += ` For reference, the daily value for ${h.name.toLowerCase()} is ${h.dailyValue}.`
  return text
}
