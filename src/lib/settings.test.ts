import { describe, expect, it } from 'vitest'
import { DEFAULT_GOALS, MEAL_IDS } from '@/constants'
import { parseGoals, parseMeals } from './settings'

describe('parseGoals', () => {
  it('returns defaults for missing value', () => {
    expect(parseGoals(null)).toEqual(DEFAULT_GOALS)
    expect(parseGoals('garbage')).toEqual(DEFAULT_GOALS)
  })
  it('keeps valid fields and replaces invalid ones', () => {
    expect(parseGoals({ kcal: 1800, protein: -5, fat: 'x', carbs: 200 })).toEqual({
      kcal: 1800,
      protein: DEFAULT_GOALS.protein,
      fat: DEFAULT_GOALS.fat,
      carbs: 200,
    })
  })
})

describe('parseMeals', () => {
  it('returns all meals in default order for missing value', () => {
    const meals = parseMeals(null)
    expect(meals.map((m) => m.id)).toEqual(MEAL_IDS)
    expect(meals.every((m) => m.visible)).toBe(true)
    expect(meals[0]?.label).toBe('Śniadanie')
  })
  it('keeps stored order and visibility, appends missing meals', () => {
    const meals = parseMeals([
      { id: 'dinner', visible: true },
      { id: 'breakfast', visible: false },
    ])
    expect(meals.map((m) => m.id)).toEqual([
      'dinner', 'breakfast', 'second_breakfast', 'lunch', 'snack_pm', 'snack',
    ])
    expect(meals[1]?.visible).toBe(false)
  })
  it('drops unknown and duplicate ids', () => {
    const meals = parseMeals([{ id: 'brunch' }, { id: 'lunch' }, { id: 'lunch', visible: false }, 5])
    expect(meals.map((m) => m.id)).toEqual([
      'lunch', 'breakfast', 'second_breakfast', 'snack_pm', 'dinner', 'snack',
    ])
    expect(meals[0]?.visible).toBe(true)
  })
})
