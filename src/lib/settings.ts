import { DEFAULT_GOALS, DEFAULT_MEALS, MAX_MEAL_LABEL, MAX_MEALS } from '@/constants'
import { formatAmount, parseDecimal } from '@/lib/format'
import type { Goals, MealSetting } from '@/types'

// Validation of settings stored as JSON. Pure functions — stored data may be old or malformed.

function isNonNegativeNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0
}

/** Validates stored goals; falls back to defaults field by field. */
export function parseGoals(value: unknown): Goals {
  const v = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  return {
    kcal: isNonNegativeNumber(v.kcal) ? v.kcal : DEFAULT_GOALS.kcal,
    protein: isNonNegativeNumber(v.protein) ? v.protein : DEFAULT_GOALS.protein,
    fat: isNonNegativeNumber(v.fat) ? v.fat : DEFAULT_GOALS.fat,
    carbs: isNonNegativeNumber(v.carbs) ? v.carbs : DEFAULT_GOALS.carbs,
  }
}

export const CUSTOM_MEAL_ID_RE = /^custom_[a-z0-9]{4,24}$/

function cleanLabel(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().replace(/\s+/g, ' ')
  return s === '' || s.length > MAX_MEAL_LABEL ? null : s
}

/**
 * Validates the stored meal list (order, visibility, labels, custom meals).
 * Built-in meals may be renamed; missing ones are appended. Custom meals need a valid id and label.
 */
export function parseMeals(value: unknown): MealSetting[] {
  const known = new Map<string, MealSetting>(DEFAULT_MEALS.map((m) => [m.id, m]))
  const result: MealSetting[] = []
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item !== 'object' || item === null) continue
      const { id, visible, label } = item as Record<string, unknown>
      if (typeof id !== 'string' || result.some((m) => m.id === id)) continue
      const isVisible = typeof visible === 'boolean' ? visible : true
      const def = known.get(id)
      if (def) {
        result.push({ ...def, label: cleanLabel(label) ?? def.label, visible: isVisible })
      } else if (CUSTOM_MEAL_ID_RE.test(id)) {
        const l = cleanLabel(label)
        if (l) result.push({ id, label: l, visible: isVisible, custom: true })
      }
    }
  }
  for (const def of DEFAULT_MEALS) {
    if (!result.some((m) => m.id === def.id)) result.push({ ...def })
  }
  return result
}

/** Random id for a custom meal, e.g. "custom_k3j9x2ab". */
export function newCustomMealId(random: () => number = Math.random): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(random() * chars.length)]
  return 'custom_' + s
}

/** Validates a meal name typed by the user (unique, case-insensitive). */
export function validateMealLabel(
  meals: readonly MealSetting[],
  label: string,
  exceptId?: string,
): { ok: true; label: string } | { ok: false; error: string } {
  const l = label.trim().replace(/\s+/g, ' ')
  if (l === '') return { ok: false, error: 'Podaj nazwę posiłku.' }
  if (l.length > MAX_MEAL_LABEL) return { ok: false, error: 'Maksymalnie ' + MAX_MEAL_LABEL + ' znaków.' }
  if (meals.some((m) => m.id !== exceptId && m.label.toLocaleLowerCase('pl') === l.toLocaleLowerCase('pl'))) {
    return { ok: false, error: 'Taki posiłek już istnieje.' }
  }
  return { ok: true, label: l }
}

export function canAddMeal(meals: readonly MealSetting[]): boolean {
  return meals.length < MAX_MEALS
}

export function addCustomMeal(meals: readonly MealSetting[], label: string, id: string): MealSetting[] {
  return [...meals, { id, label, visible: true, custom: true }]
}

export function renameMeal(meals: readonly MealSetting[], id: string, label: string): MealSetting[] {
  return meals.map((m) => (m.id === id ? { ...m, label } : m))
}

/** Removes a custom meal (built-in meals can only be hidden). */
export function removeCustomMeal(meals: readonly MealSetting[], id: string): MealSetting[] {
  return meals.filter((m) => !(m.id === id && m.custom))
}

// ---------------------------------------------------------------------------
// Settings forms
// ---------------------------------------------------------------------------

export type GoalsFormValues = Record<keyof Goals, string>
export type GoalsFormErrors = Partial<Record<keyof Goals, string>>

export function goalsToFormValues(g: Goals): GoalsFormValues {
  return {
    kcal: formatAmount(g.kcal),
    protein: formatAmount(g.protein),
    fat: formatAmount(g.fat),
    carbs: formatAmount(g.carbs),
  }
}

const GOAL_LIMITS: Record<keyof Goals, { min: number; max: number }> = {
  kcal: { min: 500, max: 10000 },
  protein: { min: 0, max: 1000 },
  fat: { min: 0, max: 1000 },
  carbs: { min: 0, max: 2000 },
}

export function validateGoalsForm(
  v: GoalsFormValues,
): { ok: true; goals: Goals } | { ok: false; errors: GoalsFormErrors } {
  const errors: GoalsFormErrors = {}
  const goals: Goals = { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  for (const key of Object.keys(GOAL_LIMITS) as (keyof Goals)[]) {
    const { min, max } = GOAL_LIMITS[key]
    const raw = v[key]
    if (raw.trim() === '' && key !== 'kcal') {
      goals[key] = 0
      continue
    }
    const n = parseDecimal(raw)
    if (n === null) errors[key] = raw.trim() === '' ? 'Podaj wartość.' : 'Niepoprawna liczba.'
    else if (n < min) errors[key] = `Minimum ${min}.`
    else if (n > max) errors[key] = `Maksymalnie ${max}.`
    else goals[key] = n
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, goals }
}

/** kcal implied by macro goals (4/9/4) — shown as a hint next to the kcal goal. */
export function kcalFromGoals(g: Pick<Goals, 'protein' | 'fat' | 'carbs'>): number {
  return 4 * g.protein + 9 * g.fat + 4 * g.carbs
}

/** Moves a meal up (-1) or down (+1); out-of-range moves return the list unchanged. */
export function moveMeal(meals: readonly MealSetting[], index: number, delta: -1 | 1): MealSetting[] {
  const target = index + delta
  if (index < 0 || index >= meals.length || target < 0 || target >= meals.length) return [...meals]
  const next = [...meals]
  const a = next[index] as MealSetting
  next[index] = next[target] as MealSetting
  next[target] = a
  return next
}

/** At least one meal must stay visible. */
export function canHideMeal(meals: readonly MealSetting[], id: string): boolean {
  return meals.filter((m) => m.visible && m.id !== id).length > 0
}
