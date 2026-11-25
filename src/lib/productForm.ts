import { parseDecimal } from '@/lib/format'
import type { Product, ProductInput } from '@/types'

// Product form: raw string values from inputs ↔ validated ProductInput. Pure functions.

export type ProductFormValues = {
  name: string
  kcal: string
  protein: string
  fat: string
  carbs: string
  servingName: string
  servingGrams: string
  isFavorite: boolean
}

export type ProductFormErrors = Partial<Record<keyof ProductFormValues, string>>

export type ProductFormResult =
  | { ok: true; input: ProductInput }
  | { ok: false; errors: ProductFormErrors }

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: '',
  kcal: '',
  protein: '',
  fat: '',
  carbs: '',
  servingName: '',
  servingGrams: '',
  isFavorite: false,
}

/** Exact value for an input field (no rounding, Polish decimal comma). */
function toInput(n: number): string {
  return String(n).replace('.', ',')
}

export function productToFormValues(p: Product): ProductFormValues {
  return {
    name: p.name,
    kcal: toInput(p.per100g.kcal),
    protein: toInput(p.per100g.protein),
    fat: toInput(p.per100g.fat),
    carbs: toInput(p.per100g.carbs),
    servingName: p.servingName ?? '',
    servingGrams: p.servingGrams === null ? '' : toInput(p.servingGrams),
    isFavorite: p.isFavorite,
  }
}

/** Required non-negative number (≤ max). Empty macros default to 0 when allowEmpty. */
function parseNonNegative(
  raw: string,
  { allowEmpty, max }: { allowEmpty: boolean; max: number },
): { value: number } | { error: string } {
  if (raw.trim() === '') return allowEmpty ? { value: 0 } : { error: 'Podaj wartość.' }
  const n = parseDecimal(raw)
  if (n === null) return { error: 'Niepoprawna liczba.' }
  if (n < 0) return { error: 'Wartość nie może być ujemna.' }
  if (n > max) return { error: `Maksymalnie ${max}.` }
  return { value: n }
}

export function validateProductForm(v: ProductFormValues): ProductFormResult {
  const errors: ProductFormErrors = {}

  const name = v.name.trim().replace(/\s+/g, ' ')
  if (name === '') errors.name = 'Podaj nazwę.'

  const kcal = parseNonNegative(v.kcal, { allowEmpty: false, max: 900 })
  const protein = parseNonNegative(v.protein, { allowEmpty: true, max: 100 })
  const fat = parseNonNegative(v.fat, { allowEmpty: true, max: 100 })
  const carbs = parseNonNegative(v.carbs, { allowEmpty: true, max: 100 })
  if ('error' in kcal) errors.kcal = kcal.error
  if ('error' in protein) errors.protein = protein.error
  if ('error' in fat) errors.fat = fat.error
  if ('error' in carbs) errors.carbs = carbs.error

  if ('value' in protein && 'value' in fat && 'value' in carbs) {
    if (protein.value + fat.value + carbs.value > 100) {
      errors.carbs = 'Suma B + T + W nie może przekraczać 100 g na 100 g.'
    }
  }

  const servingName = v.servingName.trim()
  let servingGrams: number | null = null
  if (v.servingGrams.trim() !== '') {
    const n = parseDecimal(v.servingGrams)
    if (n === null) errors.servingGrams = 'Niepoprawna liczba.'
    else if (n <= 0) errors.servingGrams = 'Waga porcji musi być większa od 0.'
    else if (n > 5000) errors.servingGrams = 'Maksymalnie 5000 g.'
    else servingGrams = n
  }
  if (servingName !== '' && v.servingGrams.trim() === '') {
    errors.servingGrams = 'Podaj wagę porcji w gramach.'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    input: {
      name,
      per100g: {
        kcal: (kcal as { value: number }).value,
        protein: (protein as { value: number }).value,
        fat: (fat as { value: number }).value,
        carbs: (carbs as { value: number }).value,
      },
      // A serving without a name gets a generic one, so it can be shown in the UI.
      servingName: servingGrams === null ? null : servingName || '1 porcja',
      servingGrams,
      isFavorite: v.isFavorite,
    },
  }
}
