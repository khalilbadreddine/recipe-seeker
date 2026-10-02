/**
 * Weekly meal plan storage, shared by the planner page and "Add to plan"
 * on recipe pages. Shape: { version: 2, days: { mon: { breakfast: [], lunch: [],
 * dinner: [], snacks: [] }, tue: {...}, ... } } with recipe slugs.
 *
 * Migrates the old single-day plan (localStorage 'rs-day-v1', or a v1 cloud
 * plan) into today's day, so nobody loses what they built.
 */

export const DAY_IDS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
export const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }
export const SLOT_CAPACITY = { breakfast: 1, lunch: 1, dinner: 1, snacks: 2 }

const WEEK_KEY = 'rs-week-v1'
const OLD_DAY_KEY = 'rs-day-v1'

export const emptyDay = () => ({ breakfast: [], lunch: [], dinner: [], snacks: [] })
export const emptyWeek = () => Object.fromEntries(DAY_IDS.map((d) => [d, emptyDay()]))

/** Monday-first weekday id for a date. */
export const todayId = (date = new Date()) => DAY_IDS[(date.getDay() + 6) % 7]

/** Keep only known slugs (when a checker is given), capped per slot. */
export function cleanDay(raw, isKnown) {
  const day = emptyDay()
  for (const slot of Object.keys(SLOT_CAPACITY)) {
    const slugs = raw && Array.isArray(raw[slot]) ? raw[slot] : []
    day[slot] = slugs.filter((s) => typeof s === 'string' && (!isKnown || isKnown(s))).slice(0, SLOT_CAPACITY[slot])
  }
  return day
}

/** Accepts a v2 week, or an old single-day plan (placed on today). */
export function cleanWeek(raw, isKnown) {
  const week = emptyWeek()
  if (raw && raw.days && typeof raw.days === 'object') {
    for (const d of DAY_IDS) week[d] = cleanDay(raw.days[d], isKnown)
  } else if (raw && typeof raw === 'object') {
    week[todayId()] = cleanDay(raw, isKnown)
  }
  return week
}

export const isDayEmpty = (day) => !day || Object.keys(SLOT_CAPACITY).every((s) => (day[s] || []).length === 0)
export const isWeekEmpty = (week) => !week || DAY_IDS.every((d) => isDayEmpty(week[d]))
export const toStored = (week) => ({ version: 2, days: week })

function read(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Load from this device; migrates the old single-day key once. */
export function loadWeek(isKnown) {
  const stored = read(WEEK_KEY)
  if (stored) return cleanWeek(stored, isKnown)
  const oldDay = read(OLD_DAY_KEY)
  if (oldDay) {
    const week = cleanWeek(oldDay, isKnown)
    saveWeek(week)
    return week
  }
  return null
}

export function saveWeek(week) {
  try {
    localStorage.setItem(WEEK_KEY, JSON.stringify(toStored(week)))
    localStorage.removeItem(OLD_DAY_KEY)
  } catch {
    /* storage unavailable: the planner still works for this visit */
  }
}

/** Put a recipe on a day/slot (single slots are replaced; snacks keep the newest two). */
export function addToPlan(slug, slot, dayId = todayId()) {
  const week = loadWeek() || emptyWeek()
  const cap = SLOT_CAPACITY[slot] || 1
  week[dayId][slot] = [slug, ...week[dayId][slot].filter((s) => s !== slug)].slice(0, cap)
  saveWeek(week)
}
