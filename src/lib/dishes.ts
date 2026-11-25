import {
  dishPer100g,
  dishPerServing,
  dishRawWeight,
  dishTotal,
  forDishAmount,
  scaleMacros,
} from '@/lib/nutrition'
import type { DishIngredientWithProduct, DishNutrition, Macros, Unit } from '@/types'

// Dish-level calculations on top of nutrition.ts. Pure functions.

export type DishSummary = {
  /** Whole recipe (ingredients mode) or one serving (manual mode). */
  total: Macros
  perServing: Macros
  /** null when weight is unknown (manual mode) */
  per100g: Macros | null
  /** cooked weight if given, otherwise sum of ingredients; null in manual mode */
  weightGrams: number | null
  servings: number
}

export function summarizeDish(n: DishNutrition<DishIngredientWithProduct>): DishSummary {
  if (n.mode === 'manual') {
    return { total: n.perServing, perServing: n.perServing, per100g: null, weightGrams: null, servings: 1 }
  }
  const total = dishTotal(n.ingredients)
  const weightGrams = n.cookedWeightGrams ?? dishRawWeight(n.ingredients)
  return {
    total,
    perServing: dishPerServing(total, n.servings),
    per100g: weightGrams > 0 ? dishPer100g(total, weightGrams) : null,
    weightGrams: weightGrams > 0 ? weightGrams : null,
    servings: n.servings,
  }
}

/** Units in which a dish can be logged: grams only when its weight is known. */
export function dishUnits(n: DishNutrition<DishIngredientWithProduct>): Unit[] {
  return summarizeDish(n).weightGrams !== null ? ['serving', 'g'] : ['serving']
}

/** Nutrition of an eaten amount of a dish (servings, or grams when weight is known). */
export function dishAmountMacros(
  n: DishNutrition<DishIngredientWithProduct>,
  amount: number,
  unit: Unit,
): Macros {
  if (n.mode === 'manual') return scaleMacros(n.perServing, unit === 'serving' ? amount : 0)
  const s = summarizeDish(n)
  return forDishAmount(s.total, s.servings, s.weightGrams ?? 0, amount, unit)
}
