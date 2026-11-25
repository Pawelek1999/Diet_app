import { describe, expect, it } from 'vitest'
import { backupFileName, parseBackupFile, summarizeBackup, validateBackup, type Backup } from './backup'

const valid: Backup = {
  app: 'kalorie',
  version: 1,
  exportedAt: '2026-11-26T10:00:00Z',
  products: [
    { id: 1, name: 'Jajko', kcal_100g: 143, protein_100g: 12.6, fat_100g: 9.5, carbs_100g: 0.7, serving_name: '1 jajko', serving_grams: 60, is_favorite: true, created_at: '', updated_at: '', deleted_at: null },
    { id: 2, name: 'Stary', kcal_100g: 50, protein_100g: 0, fat_100g: 0, carbs_100g: 0, serving_name: null, serving_grams: null, is_favorite: false, created_at: '', updated_at: '', deleted_at: '2026-01-01' },
  ],
  dishes: [
    { id: 10, name: 'Curry', mode: 'manual', servings: 1, cooked_weight_grams: null, kcal: 933, protein: 57, fat: 30, carbs: 101, description: null, notes: null, recipe_url: 'https://youtube.com/x', is_favorite: false, created_at: '', updated_at: '', deleted_at: null },
    { id: 11, name: 'Jajecznica', mode: 'ingredients', servings: 1, cooked_weight_grams: null, kcal: null, protein: null, fat: null, carbs: null, description: null, notes: null, recipe_url: null, is_favorite: false, created_at: '', updated_at: '', deleted_at: null },
  ],
  dish_ingredients: [{ dish_id: 11, product_id: 1, grams: 180, position: 0 }],
  entries: [
    { date: '2026-11-25', meal: 'breakfast', source_type: 'product', product_id: 1, dish_id: null, name: 'Jajko', amount: 2, unit: 'serving', kcal: 171.6, protein: 15, fat: 11, carbs: 1, created_at: '' },
    { date: '2026-11-20', meal: 'lunch', source_type: 'dish', product_id: null, dish_id: 10, name: 'Curry', amount: 1, unit: 'serving', kcal: 933, protein: 57, fat: 30, carbs: 101, created_at: '' },
    { date: '2026-11-22', meal: 'snack', source_type: 'quick', product_id: null, dish_id: null, name: 'Szybki', amount: 1, unit: 'serving', kcal: 250, protein: 0, fat: 0, carbs: 0, created_at: '' },
  ],
  settings: [{ key: 'goals', value: { kcal: 2000 } }],
}

describe('validateBackup', () => {
  it('accepts a valid backup (also after JSON round trip)', () => {
    const r = parseBackupFile(JSON.stringify(valid))
    expect(r.ok).toBe(true)
    expect(r.ok && r.backup.entries).toHaveLength(3)
  })

  it('accepts missing optional arrays', () => {
    const r = validateBackup({ app: 'kalorie', version: 1 })
    expect(r.ok && r.backup.products).toEqual([])
  })

  it('rejects foreign files and versions', () => {
    expect(parseBackupFile('not json')).toEqual({ ok: false, error: 'Nie udało się odczytać pliku (to nie jest poprawny JSON).' })
    expect(validateBackup([]).ok).toBe(false)
    expect(validateBackup({ app: 'other', version: 1 })).toEqual({ ok: false, error: 'To nie jest kopia zapasowa aplikacji Kalorie.' })
    expect(validateBackup({ app: 'kalorie', version: 2 })).toEqual({ ok: false, error: 'Nieobsługiwana wersja kopii (2).' })
  })

  it('rejects invalid rows with a readable message', () => {
    const bad = { ...valid, products: [{ ...valid.products[0], kcal_100g: -1 }] }
    expect(validateBackup(bad)).toEqual({ ok: false, error: 'Plik jest uszkodzony: products[0]: niepoprawne kcal' })
    const badEntry = { ...valid, entries: [{ ...valid.entries[0], source_type: 'product', product_id: null }] }
    expect(validateBackup(badEntry)).toEqual({ ok: false, error: 'Plik jest uszkodzony: entries[0]: niespójne źródło' })
    const badUrl = { ...valid, dishes: [{ ...valid.dishes[0], recipe_url: 'javascript:alert(1)' }, valid.dishes[1]] }
    expect(validateBackup(badUrl)).toEqual({ ok: false, error: 'Plik jest uszkodzony: dishes[0]: niepoprawny link' })
  })

  it('rejects broken references and duplicate ids', () => {
    const r1 = validateBackup({ ...valid, dish_ingredients: [{ dish_id: 11, product_id: 99, grams: 10, position: 0 }] })
    expect(r1.ok).toBe(false)
    const r2 = validateBackup({ ...valid, entries: [{ ...valid.entries[1], dish_id: 77 }] })
    expect(r2.ok).toBe(false)
    const r3 = validateBackup({ ...valid, products: [valid.products[0], valid.products[0]] })
    expect(r3).toEqual({ ok: false, error: 'Plik jest uszkodzony: powtórzone identyfikatory.' })
  })
})

describe('activity in backup', () => {
  it('is optional and defaults to an empty list', () => {
    const r = validateBackup(valid)
    expect(r.ok && r.backup.activity).toEqual([])
  })
  it('validates rows and duplicate days', () => {
    const a = { date: '2026-11-25', active_kcal: 500, source: 'shortcut' }
    expect(validateBackup({ ...valid, activity: [a] }).ok).toBe(true)
    expect(validateBackup({ ...valid, activity: [{ ...a, active_kcal: -1 }] })).toEqual({
      ok: false,
      error: 'Plik jest uszkodzony: activity[0]: niepoprawne kcal',
    })
    expect(validateBackup({ ...valid, activity: [a, a] })).toEqual({
      ok: false,
      error: 'Plik jest uszkodzony: powtórzone dni aktywności.',
    })
  })
})

describe('summary and file name', () => {
  it('counts active items and date range', () => {
    expect(summarizeBackup(valid)).toEqual({
      products: 1,
      dishes: 2,
      entries: 3,
      firstDate: '2026-11-20',
      lastDate: '2026-11-25',
    })
  })
  it('handles empty backup', () => {
    expect(summarizeBackup({ products: [], dishes: [], entries: [] })).toEqual({
      products: 0, dishes: 0, entries: 0, firstDate: null, lastDate: null,
    })
  })
  it('file name contains the date', () => {
    expect(backupFileName('2026-11-26')).toBe('kalorie-backup-2026-11-26.json')
  })
})
