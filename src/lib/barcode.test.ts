import { describe, expect, it } from 'vitest'
import { normalizeBarcode, parseOffProduct } from './barcode'

describe('normalizeBarcode', () => {
  it('accepts EAN-13 and EAN-8, strips spaces and dashes', () => {
    expect(normalizeBarcode('5900 512-300108')).toBe('5900512300108')
    expect(normalizeBarcode('96385074')).toBe('96385074')
  })

  it('converts UPC-A (12 digits) to EAN-13', () => {
    expect(normalizeBarcode('012345678905')).toBe('0012345678905')
  })

  it('rejects non-digits and wrong lengths', () => {
    expect(normalizeBarcode('')).toBeNull()
    expect(normalizeBarcode('1234567')).toBeNull()
    expect(normalizeBarcode('123456789012345')).toBeNull()
    expect(normalizeBarcode('59005123001AB')).toBeNull()
  })
})

describe('parseOffProduct', () => {
  it('returns null for unknown products', () => {
    expect(parseOffProduct({ status: 0, status_verbose: 'product not found' })).toBeNull()
    expect(parseOffProduct(null)).toBeNull()
    expect(parseOffProduct('x')).toBeNull()
  })

  it('maps name, brand, nutrition per 100 g and serving', () => {
    const r = parseOffProduct({
      status: 1,
      product: {
        product_name: 'Skyr naturalny',
        product_name_pl: 'Skyr  naturalny ',
        brands: 'Piątnica, Grupa',
        nutriments: { 'energy-kcal_100g': 64, proteins_100g: 12, fat_100g: 0, carbohydrates_100g: 3.96 },
        serving_size: '1 kubek (150 g)',
        serving_quantity: '150',
        serving_quantity_unit: 'g',
      },
    })
    expect(r).toEqual({
      name: 'Skyr naturalny (Piątnica)',
      kcal: '64',
      protein: '12',
      fat: '0',
      carbs: '4',
      servingName: '1 kubek (150 g)',
      servingGrams: '150',
    })
  })

  it('does not repeat the brand already in the name', () => {
    const r = parseOffProduct({ status: 1, product: { product_name: 'Piątnica Skyr', brands: 'Piątnica', nutriments: {} } })
    expect(r?.name).toBe('Piątnica Skyr')
  })

  it('converts kJ to kcal and leaves missing values empty', () => {
    const r = parseOffProduct({ status: 1, product: { product_name: 'X', nutriments: { energy_100g: 418.4, fat_100g: 1.25 } } })
    expect(r).toMatchObject({ kcal: '100', protein: '', fat: '1,3', carbs: '', servingName: '', servingGrams: '' })
  })

  it('ignores servings not in grams', () => {
    const r = parseOffProduct({
      status: 1,
      product: { product_name: 'X', nutriments: {}, serving_size: '2 szt.', serving_quantity: 2, serving_quantity_unit: 'szt' },
    })
    expect(r?.servingGrams).toBe('')
  })
})
