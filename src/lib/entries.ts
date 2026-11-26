import { dishAmountMacros, dishUnits } from '@/lib/dishes'
import { formatAmount, parseDecimal } from '@/lib/format'
import { forGrams, productGrams, rescaleSnapshot, sumMacros } from '@/lib/nutrition'
import type { Dish, Entry, Macros, MealId, MealSetting, Product, Unit } from '@/types'

// Diary entry logic. Pure functions.

/** Something that can be logged: a product or a dish. */
export type FoodItem = { kind: 'product'; product: Product } | { kind: 'dish'; dish: Dish }

export function foodItemKey(item: FoodItem): string {
  return item.kind === 'product' ? `p:${item.product.id}` : `d:${item.dish.id}`
}

export function foodItemName(item: FoodItem): string {
  return item.kind === 'product' ? item.product.name : item.dish.name
}

export function productUnits(p: Product): Unit[] {
  return p.servingGrams !== null && p.servingGrams > 0 ? ['g', 'serving'] : ['g']
}

export function foodItemUnits(item: FoodItem): Unit[] {
  return item.kind === 'product' ? productUnits(item.product) : dishUnits(item.dish)
}

/** Default amount when picking an item: 1 serving if available (dish always), else 100 g. */
export function defaultAmount(item: FoodItem): { amount: number; unit: Unit } {
  if (item.kind === 'dish') return { amount: 1, unit: 'serving' }
  return productUnits(item.product).includes('serving') ? { amount: 1, unit: 'serving' } : { amount: 100, unit: 'g' }
}

/** Nutrition of an amount of a product or dish (the snapshot stored in an entry). */
export function foodItemMacros(item: FoodItem, amount: number, unit: Unit): Macros {
  if (item.kind === 'product') {
    return forGrams(item.product.per100g, productGrams(amount, unit, item.product.servingGrams))
  }
  return dishAmountMacros(item.dish, amount, unit)
}

/**
 * New snapshot after changing an entry's amount/unit.
 * Source still available → recompute from its current values; otherwise rescale the stored snapshot
 * (only possible when the unit did not change).
 */
export function recomputeEntryMacros(
  entry: Pick<Entry, 'amount' | 'unit' | 'macros'>,
  source: FoodItem | null,
  amount: number,
  unit: Unit,
): Macros | null {
  if (source) return foodItemMacros(source, amount, unit)
  if (unit !== entry.unit) return null
  return rescaleSnapshot(entry.macros, entry.amount, amount)
}

/** Polish plural for "porcja": 1 porcja, 2–4 porcje, 5+ porcji, fractions → porcji. */
export function portionWord(n: number): string {
  if (!Number.isInteger(n)) return 'porcji'
  if (n === 1) return 'porcja'
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'porcje'
  return 'porcji'
}

/** Human amount: "150 g", "1,5 porcji", "2 × 1 kubek". */
export function amountLabel(amount: number, unit: Unit, servingName?: string | null): string {
  if (unit === 'g') return `${formatAmount(amount)} g`
  if (servingName) return amount === 1 ? servingName : `${formatAmount(amount)} × ${servingName}`
  return `${formatAmount(amount)} ${portionWord(amount)}`
}

/** Validates an amount typed by the user. */
export function parseAmount(raw: string, unit: Unit): { value: number } | { error: string } {
  const n = parseDecimal(raw)
  if (n === null) return { error: raw.trim() === '' ? 'Podaj ilość.' : 'Niepoprawna liczba.' }
  if (n <= 0) return { error: 'Ilość musi być większa od 0.' }
  const max = unit === 'g' ? 10000 : 100
  if (n > max) return { error: `Maksymalnie ${max}.` }
  return { value: n }
}

export type MealGroup = {
  meal: MealSetting
  entries: Entry[]
  total: Macros
}

/**
 * Groups a day's entries by meal in the configured order. Hidden meals are shown only when they
 * contain entries (so no data ever disappears from the day view).
 */
export function groupEntriesByMeal(entries: readonly Entry[], meals: readonly MealSetting[]): MealGroup[] {
  const byMeal = new Map<MealId, Entry[]>()
  for (const e of entries) {
    const list = byMeal.get(e.meal) ?? []
    list.push(e)
    byMeal.set(e.meal, list)
  }
  const groups = meals
    .filter((m) => m.visible || (byMeal.get(m.id)?.length ?? 0) > 0)
    .map((meal) => {
      const list = byMeal.get(meal.id) ?? []
      return { meal, entries: list, total: sumMacros(list.map((e) => e.macros)) }
    })
  // Entries of meals that no longer exist (e.g. a deleted custom meal) are never hidden.
  const known = new Set(meals.map((m) => m.id))
  const orphans = entries.filter((e) => !known.has(e.meal))
  if (orphans.length > 0) {
    groups.push({
      meal: { id: '__other', label: 'Inne', visible: true, custom: true },
      entries: orphans,
      total: sumMacros(orphans.map((e) => e.macros)),
    })
  }
  return groups
}

export type RecentItem = {
  item: FoodItem
  /** last amount/unit used for this item, if still valid for it */
  lastAmount: { amount: number; unit: Unit } | null
}

/**
 * Distinct recently logged products/dishes (newest first), skipping deleted ones.
 * `entries` must be sorted newest first.
 */
export function recentItems(
  entries: readonly Entry[],
  products: readonly Product[],
  dishes: readonly Dish[],
  limit = 15,
): RecentItem[] {
  const productById = new Map(products.map((p) => [p.id, p]))
  const dishById = new Map(dishes.map((d) => [d.id, d]))
  const seen = new Set<string>()
  const result: RecentItem[] = []
  for (const e of entries) {
    let item: FoodItem | null = null
    if (e.sourceType === 'product') {
      const p = productById.get(e.productId)
      if (p) item = { kind: 'product', product: p }
    } else if (e.sourceType === 'dish') {
      const d = dishById.get(e.dishId)
      if (d) item = { kind: 'dish', dish: d }
    }
    if (!item) continue
    const key = foodItemKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    const units = foodItemUnits(item)
    result.push({ item, lastAmount: units.includes(e.unit) ? { amount: e.amount, unit: e.unit } : null })
    if (result.length >= limit) break
  }
  return result
}

/** Fraction 0..1 of goal reached (for progress bars); 0 when goal is 0. */
export function progress(value: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(1, Math.max(0, value / goal))
}
