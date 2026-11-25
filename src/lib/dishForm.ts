import { normalizeRecipeUrl, parseDecimal } from '@/lib/format'
import type { Dish, DishInput, Macros } from '@/types'

// Dish form: raw input strings ↔ validated DishInput. Pure functions.

export type DishMode = 'manual' | 'ingredients'

export type IngredientRow = {
  productId: number
  productName: string
  grams: string
  /** Product values for the live preview (kept from the dish even if the product was deleted). */
  per100g: Macros
}

export type DishFormValues = {
  name: string
  mode: DishMode
  // manual mode (per serving)
  kcal: string
  protein: string
  fat: string
  carbs: string
  // ingredients mode
  servings: string
  cookedWeight: string
  ingredients: IngredientRow[]
  // common
  description: string
  notes: string
  recipeUrl: string
  isFavorite: boolean
}

export type DishFormErrors = Partial<Record<Exclude<keyof DishFormValues, 'ingredients'>, string>> & {
  /** error per ingredient row index */
  ingredientRows?: Record<number, string>
}

export type DishFormResult = { ok: true; input: DishInput } | { ok: false; errors: DishFormErrors }

export const EMPTY_DISH_FORM: DishFormValues = {
  name: '',
  mode: 'manual',
  kcal: '',
  protein: '',
  fat: '',
  carbs: '',
  servings: '1',
  cookedWeight: '',
  ingredients: [],
  description: '',
  notes: '',
  recipeUrl: '',
  isFavorite: false,
}

const MAX_TEXT = 4000

function toInput(n: number): string {
  return String(n).replace('.', ',')
}

export function dishToFormValues(d: Dish): DishFormValues {
  const common = {
    name: d.name,
    description: d.description ?? '',
    notes: d.notes ?? '',
    recipeUrl: d.recipeUrl ?? '',
    isFavorite: d.isFavorite,
  }
  if (d.mode === 'manual') {
    return {
      ...EMPTY_DISH_FORM,
      ...common,
      mode: 'manual',
      kcal: toInput(d.perServing.kcal),
      protein: toInput(d.perServing.protein),
      fat: toInput(d.perServing.fat),
      carbs: toInput(d.perServing.carbs),
    }
  }
  return {
    ...EMPTY_DISH_FORM,
    ...common,
    mode: 'ingredients',
    servings: toInput(d.servings),
    cookedWeight: d.cookedWeightGrams === null ? '' : toInput(d.cookedWeightGrams),
    ingredients: d.ingredients.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      grams: toInput(i.grams),
      per100g: i.per100g,
    })),
  }
}

function parseNonNegative(
  raw: string,
  { required, max }: { required: boolean; max: number },
): { value: number } | { error: string } {
  if (raw.trim() === '') return required ? { error: 'Podaj wartość.' } : { value: 0 }
  const n = parseDecimal(raw)
  if (n === null) return { error: 'Niepoprawna liczba.' }
  if (n < 0) return { error: 'Wartość nie może być ujemna.' }
  if (n > max) return { error: `Maksymalnie ${max}.` }
  return { value: n }
}

function parsePositive(raw: string, max: number): { value: number } | { error: string } {
  const n = parseDecimal(raw)
  if (n === null) return { error: raw.trim() === '' ? 'Podaj wartość.' : 'Niepoprawna liczba.' }
  if (n <= 0) return { error: 'Wartość musi być większa od 0.' }
  if (n > max) return { error: `Maksymalnie ${max}.` }
  return { value: n }
}

function textOrNull(s: string): string | null {
  const t = s.trim()
  return t === '' ? null : t
}

export function validateDishForm(v: DishFormValues): DishFormResult {
  const errors: DishFormErrors = {}

  const name = v.name.trim().replace(/\s+/g, ' ')
  if (name === '') errors.name = 'Podaj nazwę.'

  const recipeUrl = normalizeRecipeUrl(v.recipeUrl)
  if (v.recipeUrl.trim() !== '' && recipeUrl === null) {
    errors.recipeUrl = 'Niepoprawny link (musi zaczynać się od http:// lub https://).'
  }
  if (v.description.length > MAX_TEXT) errors.description = `Maksymalnie ${MAX_TEXT} znaków.`
  if (v.notes.length > MAX_TEXT) errors.notes = `Maksymalnie ${MAX_TEXT} znaków.`

  const common = {
    name,
    description: textOrNull(v.description),
    notes: textOrNull(v.notes),
    recipeUrl,
    isFavorite: v.isFavorite,
  }

  if (v.mode === 'manual') {
    const kcal = parseNonNegative(v.kcal, { required: true, max: 10000 })
    const protein = parseNonNegative(v.protein, { required: false, max: 1000 })
    const fat = parseNonNegative(v.fat, { required: false, max: 1000 })
    const carbs = parseNonNegative(v.carbs, { required: false, max: 1000 })
    if ('error' in kcal) errors.kcal = kcal.error
    if ('error' in protein) errors.protein = protein.error
    if ('error' in fat) errors.fat = fat.error
    if ('error' in carbs) errors.carbs = carbs.error
    if (Object.keys(errors).length > 0) return { ok: false, errors }
    return {
      ok: true,
      input: {
        ...common,
        mode: 'manual',
        perServing: {
          kcal: (kcal as { value: number }).value,
          protein: (protein as { value: number }).value,
          fat: (fat as { value: number }).value,
          carbs: (carbs as { value: number }).value,
        },
      },
    }
  }

  const servings = parsePositive(v.servings, 100)
  if ('error' in servings) errors.servings = servings.error

  let cookedWeightGrams: number | null = null
  if (v.cookedWeight.trim() !== '') {
    const cw = parsePositive(v.cookedWeight, 50000)
    if ('error' in cw) errors.cookedWeight = cw.error
    else cookedWeightGrams = cw.value
  }

  const ingredientRows: Record<number, string> = {}
  const ingredients: { productId: number; grams: number }[] = []
  v.ingredients.forEach((row, index) => {
    const g = parsePositive(row.grams, 20000)
    if ('error' in g) ingredientRows[index] = g.error
    else ingredients.push({ productId: row.productId, grams: g.value })
  })
  if (Object.keys(ingredientRows).length > 0) errors.ingredientRows = ingredientRows
  if (v.ingredients.length === 0) errors.mode = 'Dodaj co najmniej jeden składnik.'

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    input: {
      ...common,
      mode: 'ingredients',
      servings: (servings as { value: number }).value,
      cookedWeightGrams,
      ingredients,
    },
  }
}

/** Input for a copy of a dish ("Duplikuj"). */
export function duplicateDishInput(d: Dish): DishInput {
  const common = {
    name: `${d.name} (kopia)`,
    description: d.description,
    notes: d.notes,
    recipeUrl: d.recipeUrl,
    isFavorite: false,
  }
  if (d.mode === 'manual') return { ...common, mode: 'manual', perServing: { ...d.perServing } }
  return {
    ...common,
    mode: 'ingredients',
    servings: d.servings,
    cookedWeightGrams: d.cookedWeightGrams,
    ingredients: d.ingredients.map((i) => ({ productId: i.productId, grams: i.grams })),
  }
}
