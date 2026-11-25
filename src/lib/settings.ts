import { DEFAULT_GOALS, DEFAULT_MEALS } from '@/constants'
import type { Goals, MealId, MealSetting } from '@/types'

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

/** Validates stored meal list (order + visibility); unknown ids dropped, missing meals appended. */
export function parseMeals(value: unknown): MealSetting[] {
  const known = new Map(DEFAULT_MEALS.map((m) => [m.id, m]))
  const result: MealSetting[] = []
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item !== 'object' || item === null) continue
      const { id, visible } = item as Record<string, unknown>
      const def = typeof id === 'string' ? known.get(id as MealId) : undefined
      if (!def || result.some((m) => m.id === def.id)) continue
      result.push({ ...def, visible: typeof visible === 'boolean' ? visible : true })
    }
  }
  for (const def of DEFAULT_MEALS) {
    if (!result.some((m) => m.id === def.id)) result.push({ ...def })
  }
  return result
}
