import { describe, expect, it } from 'vitest'
import type { Product } from '@/types'
import {
  EMPTY_PRODUCT_FORM,
  productToFormValues,
  validateProductForm,
  type ProductFormValues,
} from './productForm'

const valid: ProductFormValues = {
  ...EMPTY_PRODUCT_FORM,
  name: '  Skyr   naturalny ',
  kcal: '64',
  protein: '12',
  fat: '0',
  carbs: '4,0',
}

describe('validateProductForm', () => {
  it('accepts valid values and normalizes name and decimals', () => {
    const r = validateProductForm(valid)
    expect(r).toEqual({
      ok: true,
      input: {
        name: 'Skyr naturalny',
        per100g: { kcal: 64, protein: 12, fat: 0, carbs: 4 },
        servingName: null,
        servingGrams: null,
        barcode: null,
        isFavorite: false,
      },
    })
  })

  it('treats empty macros as 0 but requires kcal', () => {
    const r = validateProductForm({ ...EMPTY_PRODUCT_FORM, name: 'Kawa', kcal: '2' })
    expect(r.ok && r.input.per100g).toEqual({ kcal: 2, protein: 0, fat: 0, carbs: 0 })
    const r2 = validateProductForm({ ...EMPTY_PRODUCT_FORM, name: 'Kawa' })
    expect(r2.ok).toBe(false)
    expect(!r2.ok && r2.errors.kcal).toBe('Podaj wartość.')
  })

  it('requires a name', () => {
    const r = validateProductForm({ ...valid, name: '   ' })
    expect(!r.ok && r.errors.name).toBe('Podaj nazwę.')
  })

  it('rejects negative, invalid and too large values', () => {
    const r = validateProductForm({ ...valid, kcal: '-1', protein: 'abc', fat: '101' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.kcal).toBe('Wartość nie może być ujemna.')
      expect(r.errors.protein).toBe('Niepoprawna liczba.')
      expect(r.errors.fat).toBe('Maksymalnie 100.')
    }
  })

  it('rejects macros summing above 100 g', () => {
    const r = validateProductForm({ ...valid, protein: '50', fat: '30', carbs: '30' })
    expect(!r.ok && r.errors.carbs).toMatch(/Suma/)
  })

  it('handles serving: grams required when name given, default name when only grams', () => {
    const r1 = validateProductForm({ ...valid, servingName: '1 kubek' })
    expect(!r1.ok && r1.errors.servingGrams).toBe('Podaj wagę porcji w gramach.')

    const r2 = validateProductForm({ ...valid, servingGrams: '150' })
    expect(r2.ok && [r2.input.servingName, r2.input.servingGrams]).toEqual(['1 porcja', 150])

    const r3 = validateProductForm({ ...valid, servingName: ' 1 kubek ', servingGrams: '150,5' })
    expect(r3.ok && [r3.input.servingName, r3.input.servingGrams]).toEqual(['1 kubek', 150.5])

    const r4 = validateProductForm({ ...valid, servingGrams: '0' })
    expect(!r4.ok && r4.errors.servingGrams).toBe('Waga porcji musi być większa od 0.')
  })

  it('validates and normalizes the barcode', () => {
    const r = validateProductForm({ ...valid, barcode: ' 012345678905 ' })
    expect(r.ok && r.input.barcode).toBe('0012345678905')
    const r2 = validateProductForm({ ...valid, barcode: '123' })
    expect(!r2.ok && r2.errors.barcode).toBe('Kod kreskowy to 8–14 cyfr.')
  })

  it('keeps full precision in form values', () => {
    const values = productToFormValues({
      id: 1, name: 'X', per100g: { kcal: 64.375, protein: 12.345, fat: 0, carbs: 4 },
      servingName: null, servingGrams: null, barcode: null, isFavorite: false, createdAt: '', updatedAt: '',
    })
    expect([values.kcal, values.protein, values.servingGrams]).toEqual(['64,375', '12,345', ''])
  })

  it('round-trips a product through form values', () => {
    const p: Product = {
      id: 1,
      name: 'Skyr waniliowy',
      per100g: { kcal: 82, protein: 9.6, fat: 0, carbs: 11 },
      servingName: '1 kubek',
      servingGrams: 150,
      barcode: '5900512300108',
      isFavorite: true,
      createdAt: '',
      updatedAt: '',
    }
    const values = productToFormValues(p)
    expect(values.protein).toBe('9,6')
    const r = validateProductForm(values)
    expect(r.ok && r.input).toEqual({
      name: p.name,
      per100g: p.per100g,
      servingName: p.servingName,
      servingGrams: p.servingGrams,
      barcode: p.barcode,
      isFavorite: true,
    })
  })
})
