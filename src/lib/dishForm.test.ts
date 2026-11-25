import { describe, expect, it } from 'vitest'
import type { Dish } from '@/types'
import {
  dishToFormValues,
  duplicateDishInput,
  EMPTY_DISH_FORM,
  validateDishForm,
  type DishFormValues,
} from './dishForm'

const Z = { kcal: 0, protein: 0, fat: 0, carbs: 0 }

const manualValues: DishFormValues = {
  ...EMPTY_DISH_FORM,
  name: ' Kurczak  curry ',
  mode: 'manual',
  kcal: '933',
  protein: '57',
  fat: '30',
  carbs: '101',
  description: '  Kremowy sos  ',
  notes: '',
  recipeUrl: 'youtube.com/watch?v=abc',
}

const ingredientValues: DishFormValues = {
  ...EMPTY_DISH_FORM,
  name: 'Owsianka',
  mode: 'ingredients',
  servings: '2',
  cookedWeight: '',
  ingredients: [
    { productId: 1, productName: 'Płatki', grams: '60', per100g: Z },
    { productId: 2, productName: 'Mleko', grams: '200,5', per100g: Z },
  ],
}

describe('validateDishForm — manual', () => {
  it('accepts valid values and normalizes text and link', () => {
    expect(validateDishForm(manualValues)).toEqual({
      ok: true,
      input: {
        name: 'Kurczak curry',
        description: 'Kremowy sos',
        notes: null,
        recipeUrl: 'https://youtube.com/watch?v=abc',
        isFavorite: false,
        mode: 'manual',
        perServing: { kcal: 933, protein: 57, fat: 30, carbs: 101 },
      },
    })
  })

  it('requires kcal, macros default to 0', () => {
    const r = validateDishForm({ ...manualValues, kcal: '', protein: '', fat: '', carbs: '' })
    expect(!r.ok && r.errors.kcal).toBe('Podaj wartość.')
    const r2 = validateDishForm({ ...manualValues, protein: '', fat: '', carbs: '' })
    expect(r2.ok && r2.input.mode === 'manual' && r2.input.perServing).toEqual({
      kcal: 933,
      protein: 0,
      fat: 0,
      carbs: 0,
    })
  })

  it('rejects unsafe links and missing name', () => {
    const r = validateDishForm({ ...manualValues, name: '', recipeUrl: 'javascript:alert(1)' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.name).toBe('Podaj nazwę.')
      expect(r.errors.recipeUrl).toMatch(/Niepoprawny link/)
    }
  })
})

describe('validateDishForm — ingredients', () => {
  it('accepts valid ingredients', () => {
    const r = validateDishForm(ingredientValues)
    expect(r.ok && r.input).toEqual({
      name: 'Owsianka',
      description: null,
      notes: null,
      recipeUrl: null,
      isFavorite: false,
      mode: 'ingredients',
      servings: 2,
      cookedWeightGrams: null,
      ingredients: [
        { productId: 1, grams: 60 },
        { productId: 2, grams: 200.5 },
      ],
    })
  })

  it('requires at least one ingredient', () => {
    const r = validateDishForm({ ...ingredientValues, ingredients: [] })
    expect(!r.ok && r.errors.mode).toBe('Dodaj co najmniej jeden składnik.')
  })

  it('reports invalid grams per row', () => {
    const r = validateDishForm({
      ...ingredientValues,
      ingredients: [
        { productId: 1, productName: 'A', grams: '0', per100g: Z },
        { productId: 2, productName: 'B', grams: '50', per100g: Z },
        { productId: 3, productName: 'C', grams: '', per100g: Z },
      ],
    })
    expect(!r.ok && r.errors.ingredientRows).toEqual({
      0: 'Wartość musi być większa od 0.',
      2: 'Podaj wartość.',
    })
  })

  it('validates servings and cooked weight', () => {
    const r = validateDishForm({ ...ingredientValues, servings: '0', cookedWeight: 'abc' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.servings).toBe('Wartość musi być większa od 0.')
      expect(r.errors.cookedWeight).toBe('Niepoprawna liczba.')
    }
    const r2 = validateDishForm({ ...ingredientValues, servings: '1,5', cookedWeight: '450' })
    expect(r2.ok && r2.input.mode === 'ingredients' && [r2.input.servings, r2.input.cookedWeightGrams]).toEqual([1.5, 450])
  })
})

describe('round trip and duplicate', () => {
  const manualDish: Dish = {
    id: 7,
    name: 'Kurczak curry',
    description: 'Opis',
    notes: 'Uwagi',
    recipeUrl: 'https://www.youtube.com/watch?v=abc',
    isFavorite: true,
    createdAt: '',
    updatedAt: '',
    mode: 'manual',
    perServing: { kcal: 933, protein: 57, fat: 30.5, carbs: 101 },
  }

  const ingredientDish: Dish = {
    id: 8,
    name: 'Owsianka',
    description: null,
    notes: null,
    recipeUrl: null,
    isFavorite: false,
    createdAt: '',
    updatedAt: '',
    mode: 'ingredients',
    servings: 2,
    cookedWeightGrams: 400,
    ingredients: [
      { productId: 1, productName: 'Płatki', grams: 60, per100g: { kcal: 379, protein: 13, fat: 6.5, carbs: 68 } },
    ],
  }

  it('manual dish survives form round trip', () => {
    const r = validateDishForm(dishToFormValues(manualDish))
    expect(r.ok && r.input).toEqual({
      name: 'Kurczak curry',
      description: 'Opis',
      notes: 'Uwagi',
      recipeUrl: 'https://www.youtube.com/watch?v=abc',
      isFavorite: true,
      mode: 'manual',
      perServing: { kcal: 933, protein: 57, fat: 30.5, carbs: 101 },
    })
  })

  it('ingredients dish survives form round trip', () => {
    const values = dishToFormValues(ingredientDish)
    expect(values.ingredients).toEqual([
      { productId: 1, productName: 'Płatki', grams: '60', per100g: { kcal: 379, protein: 13, fat: 6.5, carbs: 68 } },
    ])
    const r = validateDishForm(values)
    expect(r.ok && r.input.mode === 'ingredients' && r.input.cookedWeightGrams).toBe(400)
  })

  it('duplicate gets a new name, is not favorite, keeps nutrition', () => {
    const d = duplicateDishInput(manualDish)
    expect(d.name).toBe('Kurczak curry (kopia)')
    expect(d.isFavorite).toBe(false)
    expect(d.mode === 'manual' && d.perServing.kcal).toBe(933)
    const d2 = duplicateDishInput(ingredientDish)
    expect(d2.mode === 'ingredients' && d2.ingredients).toEqual([{ productId: 1, grams: 60 }])
  })
})
