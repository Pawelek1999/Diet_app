import { describe, expect, it } from 'vitest'
import { DEFAULT_GOALS, MEAL_IDS } from '@/constants'
import {
  addCustomMeal,
  canAddMeal,
  canHideMeal,
  newCustomMealId,
  removeCustomMeal,
  renameMeal,
  validateMealLabel,
  goalsToFormValues,
  kcalFromGoals,
  moveMeal,
  parseGoals,
  parseMeals,
  validateGoalsForm,
} from './settings'

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

describe('goals form', () => {
  it('round-trips goals', () => {
    const v = goalsToFormValues({ kcal: 2200, protein: 140.5, fat: 70, carbs: 250 })
    expect(v.protein).toBe('140,5')
    expect(validateGoalsForm(v)).toEqual({ ok: true, goals: { kcal: 2200, protein: 140.5, fat: 70, carbs: 250 } })
  })
  it('requires kcal in range, empty macros mean 0', () => {
    expect(validateGoalsForm({ kcal: '', protein: '', fat: '', carbs: '' })).toEqual({
      ok: false,
      errors: { kcal: 'Podaj wartość.' },
    })
    expect(validateGoalsForm({ kcal: '300', protein: '', fat: '', carbs: '' })).toEqual({
      ok: false,
      errors: { kcal: 'Minimum 500.' },
    })
    expect(validateGoalsForm({ kcal: '1800', protein: '', fat: '', carbs: '' })).toEqual({
      ok: true,
      goals: { kcal: 1800, protein: 0, fat: 0, carbs: 0 },
    })
  })
  it('rejects invalid and negative macros', () => {
    const r = validateGoalsForm({ kcal: '2000', protein: 'abc', fat: '-1', carbs: '3000' })
    expect(r).toEqual({
      ok: false,
      errors: { protein: 'Niepoprawna liczba.', fat: 'Minimum 0.', carbs: 'Maksymalnie 2000.' },
    })
  })
  it('kcalFromGoals', () => {
    expect(kcalFromGoals({ protein: 140, fat: 70, carbs: 250 })).toBe(2190)
  })
})

describe('meal list editing', () => {
  const meals = parseMeals(null)
  it('moves up and down, ignores out of range', () => {
    expect(moveMeal(meals, 1, -1).map((m) => m.id).slice(0, 2)).toEqual(['second_breakfast', 'breakfast'])
    expect(moveMeal(meals, 0, -1).map((m) => m.id)).toEqual(meals.map((m) => m.id))
    expect(moveMeal(meals, 5, 1).map((m) => m.id)).toEqual(meals.map((m) => m.id))
  })
  it('keeps at least one visible meal', () => {
    const onlyLunch = meals.map((m) => ({ ...m, visible: m.id === 'lunch' }))
    expect(canHideMeal(onlyLunch, 'lunch')).toBe(false)
    expect(canHideMeal(meals, 'lunch')).toBe(true)
  })
})

describe('custom meals', () => {
  it('parses custom meals and renamed built-in meals', () => {
    const meals = parseMeals([
      { id: 'breakfast', visible: true, label: '  Śniadanko ' },
      { id: 'custom_abc123xy', visible: true, label: 'Przed treningiem' },
      { id: 'custom_bad id', label: 'X' },
      { id: 'custom_nolabel1' },
      { id: 'hacker', label: 'X' },
    ])
    expect(meals[0]).toEqual({ id: 'breakfast', label: 'Śniadanko', visible: true, custom: false })
    expect(meals[1]).toEqual({ id: 'custom_abc123xy', label: 'Przed treningiem', visible: true, custom: true })
    expect(meals.map((m) => m.id)).not.toContain('hacker')
    expect(meals.map((m) => m.id)).not.toContain('custom_nolabel1')
    expect(meals).toHaveLength(7)
  })

  it('falls back to the default label for an empty/too long name', () => {
    expect(parseMeals([{ id: 'lunch', label: '' }])[0]?.label).toBe('Obiad')
    expect(parseMeals([{ id: 'lunch', label: 'x'.repeat(31) }])[0]?.label).toBe('Obiad')
  })

  it('generates valid ids', () => {
    expect(newCustomMealId()).toMatch(/^custom_[a-z0-9]{8}$/)
    expect(newCustomMealId(() => 0)).toBe('custom_aaaaaaaa')
  })

  it('validates labels: required, length, unique (case-insensitive)', () => {
    const meals = parseMeals(null)
    expect(validateMealLabel(meals, '  Przed   treningiem ')).toEqual({ ok: true, label: 'Przed treningiem' })
    expect(validateMealLabel(meals, ' ')).toEqual({ ok: false, error: 'Podaj nazwę posiłku.' })
    expect(validateMealLabel(meals, 'x'.repeat(31)).ok).toBe(false)
    expect(validateMealLabel(meals, 'obiad')).toEqual({ ok: false, error: 'Taki posiłek już istnieje.' })
    expect(validateMealLabel(meals, 'Obiad', 'lunch')).toEqual({ ok: true, label: 'Obiad' })
  })

  it('adds, renames and removes only custom meals', () => {
    let meals = addCustomMeal(parseMeals(null), 'Przed treningiem', 'custom_abcd1234')
    expect(meals.at(-1)).toEqual({ id: 'custom_abcd1234', label: 'Przed treningiem', visible: true, custom: true })
    meals = renameMeal(meals, 'custom_abcd1234', 'Po treningu')
    expect(meals.at(-1)?.label).toBe('Po treningu')
    expect(removeCustomMeal(meals, 'lunch')).toHaveLength(7)
    expect(removeCustomMeal(meals, 'custom_abcd1234')).toHaveLength(6)
  })

  it('limits the number of meals', () => {
    let meals = parseMeals(null)
    for (let i = 0; i < 6; i++) meals = addCustomMeal(meals, 'M' + i, 'custom_aaaa000' + i)
    expect(canAddMeal(meals)).toBe(false)
  })
})
