import { describe, expect, it } from 'vitest'
import type { Macros } from '@/types'
import {
  dailyKcalGoal,
  dishPer100g,
  dishPerServing,
  dishRawWeight,
  dishTotal,
  forDishAmount,
  forGrams,
  isKcalConsistent,
  kcalFromMacros,
  productGrams,
  rescaleSnapshot,
  sumMacros,
  ZERO_MACROS,
} from './nutrition'

const egg: Macros = { kcal: 143, protein: 12.6, fat: 9.5, carbs: 0.7 }
const oats: Macros = { kcal: 379, protein: 13.2, fat: 6.5, carbs: 67.7 }
const milk: Macros = { kcal: 47, protein: 3.4, fat: 1.5, carbs: 4.9 }

function expectMacros(actual: Macros, expected: Macros) {
  expect(actual.kcal).toBeCloseTo(expected.kcal, 6)
  expect(actual.protein).toBeCloseTo(expected.protein, 6)
  expect(actual.fat).toBeCloseTo(expected.fat, 6)
  expect(actual.carbs).toBeCloseTo(expected.carbs, 6)
}

describe('forGrams', () => {
  it('scales per-100g values to the given mass', () => {
    expectMacros(forGrams(egg, 60), { kcal: 85.8, protein: 7.56, fat: 5.7, carbs: 0.42 })
  })
  it('returns zeros for 0 g', () => {
    expectMacros(forGrams(egg, 0), ZERO_MACROS)
  })
  it('handles 100 g identity', () => {
    expectMacros(forGrams(oats, 100), oats)
  })
})

describe('sumMacros', () => {
  it('sums all fields', () => {
    expectMacros(sumMacros([egg, milk]), { kcal: 190, protein: 16, fat: 11, carbs: 5.6 })
  })
  it('returns zeros for empty list', () => {
    expectMacros(sumMacros([]), ZERO_MACROS)
  })
})

describe('dishes', () => {
  const ingredients = [
    { per100g: oats, grams: 60 },
    { per100g: milk, grams: 200 },
  ]
  const total = dishTotal(ingredients)

  it('dishTotal sums ingredients', () => {
    // oats 60 g: 227.4 kcal; milk 200 g: 94 kcal
    expect(total.kcal).toBeCloseTo(321.4, 6)
    expect(total.protein).toBeCloseTo(7.92 + 6.8, 6)
  })

  it('dishRawWeight sums grams', () => {
    expect(dishRawWeight(ingredients)).toBe(260)
  })

  it('dishPerServing divides by servings', () => {
    expect(dishPerServing(total, 2).kcal).toBeCloseTo(160.7, 6)
  })

  it('dishPerServing guards against 0 servings', () => {
    expectMacros(dishPerServing(total, 0), ZERO_MACROS)
  })

  it('dishPer100g uses given weight', () => {
    expect(dishPer100g(total, 260).kcal).toBeCloseTo((321.4 * 100) / 260, 6)
  })

  it('dishPer100g guards against 0 weight', () => {
    expectMacros(dishPer100g(total, 0), ZERO_MACROS)
  })

  it('forDishAmount in servings (1.5 portion)', () => {
    expect(forDishAmount(total, 2, 260, 1.5, 'serving').kcal).toBeCloseTo(241.05, 6)
  })

  it('forDishAmount in servings (0.5 servings dish)', () => {
    // A dish declared as half a serving: 1 serving = 2x total
    expect(forDishAmount(total, 0.5, 260, 1, 'serving').kcal).toBeCloseTo(642.8, 6)
  })

  it('forDishAmount in grams uses raw weight when no cooked weight', () => {
    expect(forDishAmount(total, 2, 260, 130, 'g').kcal).toBeCloseTo(160.7, 6)
  })

  it('forDishAmount in grams uses cooked weight when given', () => {
    // cooked weight 400 g → 100 g of dish = 80.35 kcal
    expect(forDishAmount(total, 2, 400, 100, 'g').kcal).toBeCloseTo(80.35, 6)
  })
})

describe('productGrams', () => {
  it('returns grams as is', () => {
    expect(productGrams(120, 'g', 60)).toBe(120)
  })
  it('multiplies servings by serving size', () => {
    expect(productGrams(2, 'serving', 60)).toBe(120)
  })
  it('returns 0 for servings without serving size', () => {
    expect(productGrams(2, 'serving', null)).toBe(0)
  })
})

describe('rescaleSnapshot', () => {
  it('rescales proportionally', () => {
    const snap = forGrams(egg, 60)
    expectMacros(rescaleSnapshot(snap, 60, 120), forGrams(egg, 120))
  })
  it('guards against old amount 0', () => {
    expectMacros(rescaleSnapshot(egg, 0, 10), ZERO_MACROS)
  })
})

describe('kcal consistency', () => {
  it('kcalFromMacros uses 4/4/9', () => {
    expect(kcalFromMacros({ protein: 10, carbs: 20, fat: 5 })).toBe(165)
  })
  it('accepts realistic product (egg)', () => {
    expect(isKcalConsistent(egg)).toBe(true)
  })
  it('flags clearly wrong kcal', () => {
    expect(isKcalConsistent({ ...egg, kcal: 300 })).toBe(false)
  })
  it('treats products without macros as consistent', () => {
    expect(isKcalConsistent({ kcal: 250, protein: 0, fat: 0, carbs: 0 })).toBe(true)
  })
  it('flags 0 kcal with significant macros', () => {
    expect(isKcalConsistent({ kcal: 0, protein: 10, fat: 0, carbs: 0 })).toBe(false)
  })
  it('respects custom tolerance', () => {
    const m = { kcal: 100, protein: 0, fat: 0, carbs: 30 } // computed 120
    expect(isKcalConsistent(m, 0.15)).toBe(false)
    expect(isKcalConsistent(m, 0.2)).toBe(true)
  })
})

describe('dailyKcalGoal', () => {
  const on = { addToGoal: true, percent: 100 }
  it('returns base goal when disabled', () => {
    expect(dailyKcalGoal(2200, 500, { addToGoal: false, percent: 100 })).toBe(2200)
  })
  it('returns base goal when no activity', () => {
    expect(dailyKcalGoal(2200, undefined, on)).toBe(2200)
  })
  it('adds full activity at 100%', () => {
    expect(dailyKcalGoal(2200, 500, on)).toBe(2700)
  })
  it('adds partial activity', () => {
    expect(dailyKcalGoal(2200, 500, { addToGoal: true, percent: 50 })).toBe(2450)
  })
  it('percent 0 adds nothing', () => {
    expect(dailyKcalGoal(2200, 500, { addToGoal: true, percent: 0 })).toBe(2200)
  })
})
