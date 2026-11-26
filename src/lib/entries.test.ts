import { describe, expect, it } from 'vitest'
import { DEFAULT_MEALS } from '@/constants'
import type { Dish, Entry, Product } from '@/types'
import {
  amountLabel,
  defaultAmount,
  foodItemMacros,
  foodItemUnits,
  groupEntriesByMeal,
  parseAmount,
  portionWord,
  progress,
  recentItems,
  recomputeEntryMacros,
  type FoodItem,
} from './entries'

const egg: Product = {
  id: 1,
  name: 'Jajko',
  per100g: { kcal: 143, protein: 12.6, fat: 9.5, carbs: 0.7 },
  servingName: '1 jajko',
  servingGrams: 60,
  barcode: null,
  isFavorite: false,
  createdAt: '',
  updatedAt: '',
}
const rice: Product = { ...egg, id: 2, name: 'Ryż', per100g: { kcal: 350, protein: 7, fat: 0.6, carbs: 78 }, servingName: null, servingGrams: null }
const curry: Dish = {
  id: 10,
  name: 'Kurczak curry',
  description: null,
  notes: null,
  recipeUrl: null,
  isFavorite: false,
  createdAt: '',
  updatedAt: '',
  mode: 'manual',
  perServing: { kcal: 933, protein: 57, fat: 30, carbs: 101 },
}

const eggItem: FoodItem = { kind: 'product', product: egg }
const riceItem: FoodItem = { kind: 'product', product: rice }
const curryItem: FoodItem = { kind: 'dish', dish: curry }

function entry(over: Partial<Entry> & Pick<Entry, 'id'>): Entry {
  return {
    date: '2026-11-25',
    meal: 'breakfast',
    name: 'Jajko',
    amount: 2,
    unit: 'serving',
    macros: { kcal: 171.6, protein: 15.12, fat: 11.4, carbs: 0.84 },
    createdAt: '',
    sourceType: 'product',
    productId: 1,
    ...over,
  } as Entry
}

describe('units and defaults', () => {
  it('product with serving: g + serving, default 1 serving', () => {
    expect(foodItemUnits(eggItem)).toEqual(['g', 'serving'])
    expect(defaultAmount(eggItem)).toEqual({ amount: 1, unit: 'serving' })
  })
  it('product without serving: grams only, default 100 g', () => {
    expect(foodItemUnits(riceItem)).toEqual(['g'])
    expect(defaultAmount(riceItem)).toEqual({ amount: 100, unit: 'g' })
  })
  it('manual dish: servings only, default 1', () => {
    expect(foodItemUnits(curryItem)).toEqual(['serving'])
    expect(defaultAmount(curryItem)).toEqual({ amount: 1, unit: 'serving' })
  })
})

describe('foodItemMacros', () => {
  it('product in servings uses serving grams', () => {
    expect(foodItemMacros(eggItem, 2, 'serving').kcal).toBeCloseTo(171.6, 6)
  })
  it('product in grams', () => {
    expect(foodItemMacros(riceItem, 80, 'g').kcal).toBeCloseTo(280, 6)
  })
  it('dish in servings', () => {
    expect(foodItemMacros(curryItem, 1.5, 'serving').kcal).toBeCloseTo(1399.5, 6)
  })
})

describe('recomputeEntryMacros', () => {
  const e = entry({ id: 1 })
  it('uses the source when available', () => {
    expect(recomputeEntryMacros(e, eggItem, 3, 'serving')?.kcal).toBeCloseTo(257.4, 6)
    expect(recomputeEntryMacros(e, eggItem, 100, 'g')?.kcal).toBeCloseTo(143, 6)
  })
  it('rescales the snapshot when the source is gone', () => {
    expect(recomputeEntryMacros(e, null, 1, 'serving')?.kcal).toBeCloseTo(85.8, 6)
  })
  it('cannot change unit without the source', () => {
    expect(recomputeEntryMacros(e, null, 100, 'g')).toBeNull()
  })
})

describe('labels', () => {
  it('portionWord follows Polish plural rules', () => {
    expect([1, 2, 4, 5, 12, 22, 25].map(portionWord)).toEqual([
      'porcja', 'porcje', 'porcje', 'porcji', 'porcji', 'porcje', 'porcji',
    ])
    expect(portionWord(1.5)).toBe('porcji')
  })
  it('amountLabel', () => {
    expect(amountLabel(150, 'g')).toBe('150 g')
    expect(amountLabel(1.5, 'serving')).toBe('1,5 porcji')
    expect(amountLabel(1, 'serving', '1 jajko')).toBe('1 jajko')
    expect(amountLabel(2, 'serving', '1 jajko')).toBe('2 × 1 jajko')
  })
})

describe('parseAmount', () => {
  it('accepts positive numbers with comma', () => {
    expect(parseAmount('1,5', 'serving')).toEqual({ value: 1.5 })
  })
  it('rejects empty, zero, invalid, too large', () => {
    expect(parseAmount('', 'g')).toEqual({ error: 'Podaj ilość.' })
    expect(parseAmount('0', 'g')).toEqual({ error: 'Ilość musi być większa od 0.' })
    expect(parseAmount('x', 'g')).toEqual({ error: 'Niepoprawna liczba.' })
    expect(parseAmount('101', 'serving')).toEqual({ error: 'Maksymalnie 100.' })
    expect(parseAmount('10001', 'g')).toEqual({ error: 'Maksymalnie 10000.' })
  })
})

describe('groupEntriesByMeal', () => {
  it('keeps meal order, sums per meal, includes empty visible meals', () => {
    const groups = groupEntriesByMeal(
      [entry({ id: 1, meal: 'dinner' }), entry({ id: 2, meal: 'breakfast' }), entry({ id: 3, meal: 'breakfast' })],
      DEFAULT_MEALS,
    )
    expect(groups.map((g) => g.meal.id)).toEqual(DEFAULT_MEALS.map((m) => m.id))
    expect(groups[0]?.entries.map((e) => e.id)).toEqual([2, 3])
    expect(groups[0]?.total.kcal).toBeCloseTo(343.2, 6)
    expect(groups[1]?.entries).toEqual([])
  })
  it('shows hidden meals only when they have entries', () => {
    const meals = DEFAULT_MEALS.map((m) => (m.id === 'snack_pm' || m.id === 'snack' ? { ...m, visible: false } : m))
    const groups = groupEntriesByMeal([entry({ id: 1, meal: 'snack' })], meals)
    expect(groups.map((g) => g.meal.id)).toEqual(['breakfast', 'second_breakfast', 'lunch', 'dinner', 'snack'])
  })
})

describe('groupEntriesByMeal — orphans', () => {
  it('puts entries of deleted meals into an "Inne" group', () => {
    const groups = groupEntriesByMeal([entry({ id: 1, meal: 'custom_gone1234' })], DEFAULT_MEALS)
    const last = groups.at(-1)
    expect(last?.meal.label).toBe('Inne')
    expect(last?.entries.map((e) => e.id)).toEqual([1])
  })
})

describe('recentItems', () => {
  it('returns distinct items newest first with last amount, skipping missing sources', () => {
    const entries: Entry[] = [
      entry({ id: 5, amount: 2, unit: 'serving' }),
      entry({ id: 4, sourceType: 'dish', dishId: 10, productId: undefined, amount: 0.5, unit: 'serving' } as Partial<Entry> & { id: number }),
      entry({ id: 3, amount: 120, unit: 'g' }),
      entry({ id: 2, productId: 99 }),
      entry({ id: 1, productId: 2, amount: 80, unit: 'g' }),
    ]
    const r = recentItems(entries, [egg, rice], [curry])
    expect(r.map((x) => (x.item.kind === 'product' ? `p${x.item.product.id}` : `d${x.item.dish.id}`))).toEqual([
      'p1', 'd10', 'p2',
    ])
    expect(r[0]?.lastAmount).toEqual({ amount: 2, unit: 'serving' })
    expect(r[1]?.lastAmount).toEqual({ amount: 0.5, unit: 'serving' })
    expect(r[2]?.lastAmount).toEqual({ amount: 80, unit: 'g' })
  })
  it('drops last amount when its unit is no longer valid', () => {
    const r = recentItems([entry({ id: 1, productId: 2, unit: 'serving', amount: 1 })], [rice], [])
    expect(r[0]?.lastAmount).toBeNull()
  })
  it('respects limit', () => {
    const entries = [entry({ id: 2 }), entry({ id: 1, productId: 2, unit: 'g', amount: 50 })]
    expect(recentItems(entries, [egg, rice], [], 1)).toHaveLength(1)
  })
})

describe('progress', () => {
  it('clamps to 0..1', () => {
    expect(progress(1100, 2200)).toBe(0.5)
    expect(progress(3000, 2200)).toBe(1)
    expect(progress(-5, 2200)).toBe(0)
    expect(progress(100, 0)).toBe(0)
  })
})
