import { describe, expect, it } from 'vitest'
import type { DishIngredientWithProduct, DishNutrition } from '@/types'
import { dishAmountMacros, dishUnits, summarizeDish } from './dishes'

const oats: DishIngredientWithProduct = {
  productId: 1,
  productName: 'Płatki owsiane',
  grams: 60,
  per100g: { kcal: 379, protein: 13.2, fat: 6.5, carbs: 67.7 },
}
const milk: DishIngredientWithProduct = {
  productId: 2,
  productName: 'Mleko',
  grams: 200,
  per100g: { kcal: 47, protein: 3.4, fat: 1.5, carbs: 4.9 },
}

const porridge: DishNutrition<DishIngredientWithProduct> = {
  mode: 'ingredients',
  servings: 2,
  cookedWeightGrams: null,
  ingredients: [oats, milk],
}

const curry: DishNutrition<DishIngredientWithProduct> = {
  mode: 'manual',
  perServing: { kcal: 933, protein: 57, fat: 30, carbs: 101 },
}

describe('summarizeDish', () => {
  it('ingredients mode: total, per serving, per 100 g from raw weight', () => {
    const s = summarizeDish(porridge)
    expect(s.total.kcal).toBeCloseTo(321.4, 6)
    expect(s.perServing.kcal).toBeCloseTo(160.7, 6)
    expect(s.weightGrams).toBe(260)
    expect(s.per100g?.kcal).toBeCloseTo((321.4 * 100) / 260, 6)
    expect(s.servings).toBe(2)
  })

  it('ingredients mode: cooked weight overrides raw weight', () => {
    const s = summarizeDish({ ...porridge, cookedWeightGrams: 400 } as typeof porridge)
    expect(s.weightGrams).toBe(400)
    expect(s.per100g?.kcal).toBeCloseTo(80.35, 6)
  })

  it('ingredients mode with no ingredients has no weight', () => {
    const s = summarizeDish({ ...porridge, ingredients: [] } as typeof porridge)
    expect(s.total.kcal).toBe(0)
    expect(s.weightGrams).toBeNull()
    expect(s.per100g).toBeNull()
  })

  it('manual mode: per serving equals entered values, no weight', () => {
    const s = summarizeDish(curry)
    expect(s.perServing).toEqual({ kcal: 933, protein: 57, fat: 30, carbs: 101 })
    expect(s.per100g).toBeNull()
    expect(s.weightGrams).toBeNull()
  })
})

describe('dishUnits', () => {
  it('allows grams only when weight is known', () => {
    expect(dishUnits(porridge)).toEqual(['serving', 'g'])
    expect(dishUnits(curry)).toEqual(['serving'])
  })
})

describe('dishAmountMacros', () => {
  it('manual: scales by servings', () => {
    expect(dishAmountMacros(curry, 0.5, 'serving').kcal).toBeCloseTo(466.5, 6)
  })
  it('manual: grams are not supported (0)', () => {
    expect(dishAmountMacros(curry, 100, 'g').kcal).toBe(0)
  })
  it('ingredients: 1.5 servings and grams', () => {
    expect(dishAmountMacros(porridge, 1.5, 'serving').kcal).toBeCloseTo(241.05, 6)
    expect(dishAmountMacros(porridge, 130, 'g').kcal).toBeCloseTo(160.7, 6)
  })
})
