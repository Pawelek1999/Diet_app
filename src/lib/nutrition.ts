import type { Macros, Unit } from '@/types'

// Pure nutrition calculations. No rounding here — round only when displaying (src/lib/format.ts).

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, fat: 0, carbs: 0 }

export function scaleMacros(m: Macros, factor: number): Macros {
  return {
    kcal: m.kcal * factor,
    protein: m.protein * factor,
    fat: m.fat * factor,
    carbs: m.carbs * factor,
  }
}

export function sumMacros(list: readonly Macros[]): Macros {
  return list.reduce<Macros>(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      fat: acc.fat + m.fat,
      carbs: acc.carbs + m.carbs,
    }),
    ZERO_MACROS,
  )
}

/** Values per 100 g → values for the given mass. */
export function forGrams(per100g: Macros, grams: number): Macros {
  return scaleMacros(per100g, grams / 100)
}

/** Total nutrition of a dish (sum of all ingredients). */
export function dishTotal(ingredients: readonly { per100g: Macros; grams: number }[]): Macros {
  return sumMacros(ingredients.map((i) => forGrams(i.per100g, i.grams)))
}

/** Raw (uncooked) weight of a dish = sum of ingredient grams. */
export function dishRawWeight(ingredients: readonly { grams: number }[]): number {
  return ingredients.reduce((acc, i) => acc + i.grams, 0)
}

export function dishPerServing(total: Macros, servings: number): Macros {
  if (servings <= 0) return ZERO_MACROS
  return scaleMacros(total, 1 / servings)
}

/** Per 100 g of the dish. totalWeightGrams = cooked weight if known, otherwise sum of ingredients. */
export function dishPer100g(total: Macros, totalWeightGrams: number): Macros {
  if (totalWeightGrams <= 0) return ZERO_MACROS
  return scaleMacros(total, 100 / totalWeightGrams)
}

/**
 * Nutrition of an eaten amount of a dish.
 * unit 'serving': amount is a number of servings.
 * unit 'g': amount is grams of the dish; weight = cookedWeight ?? rawWeight.
 */
export function forDishAmount(
  total: Macros,
  servings: number,
  totalWeightGrams: number,
  amount: number,
  unit: Unit,
): Macros {
  if (unit === 'serving') return scaleMacros(dishPerServing(total, servings), amount)
  return forGrams(dishPer100g(total, totalWeightGrams), amount)
}

/** Product amount in grams: unit 'serving' uses the product's serving size. */
export function productGrams(amount: number, unit: Unit, servingGrams: number | null): number {
  if (unit === 'g') return amount
  return servingGrams && servingGrams > 0 ? amount * servingGrams : 0
}

/**
 * Rescale an entry snapshot to a new amount (used when the source product/dish was deleted).
 */
export function rescaleSnapshot(snapshot: Macros, oldAmount: number, newAmount: number): Macros {
  if (oldAmount <= 0) return ZERO_MACROS
  return scaleMacros(snapshot, newAmount / oldAmount)
}

/** Energy implied by macros: 4 kcal/g protein & carbs, 9 kcal/g fat. */
export function kcalFromMacros(m: Pick<Macros, 'protein' | 'fat' | 'carbs'>): number {
  return 4 * m.protein + 4 * m.carbs + 9 * m.fat
}

/**
 * Whether declared kcal roughly matches macros (relative tolerance).
 * Products with no macros (e.g. only kcal known) are treated as consistent.
 */
export function isKcalConsistent(m: Macros, tolerance = 0.15): boolean {
  const computed = kcalFromMacros(m)
  if (computed === 0) return true
  if (m.kcal === 0) return computed < 5
  return Math.abs(m.kcal - computed) / Math.max(m.kcal, computed) <= tolerance
}

/** Daily kcal goal including activity (Garmin), if the user enabled it. */
export function dailyKcalGoal(
  baseGoal: number,
  activeKcal: number | undefined,
  opts: { addToGoal: boolean; percent: number },
): number {
  if (!opts.addToGoal || activeKcal === undefined || activeKcal <= 0) return baseGoal
  return baseGoal + (activeKcal * Math.max(0, opts.percent)) / 100
}
