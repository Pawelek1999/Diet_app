import { describe, expect, it } from 'vitest'
import { EMPTY_QUICK_ENTRY, quickEntryToFormValues, validateQuickEntry } from './quickEntry'

describe('validateQuickEntry', () => {
  it('accepts kcal only, macros default to 0 and name to default', () => {
    expect(validateQuickEntry({ ...EMPTY_QUICK_ENTRY, kcal: '250' })).toEqual({
      ok: true,
      name: 'Szybki wpis',
      macros: { kcal: 250, protein: 0, fat: 0, carbs: 0 },
    })
  })

  it('accepts kcal with macros and decimal commas', () => {
    const r = validateQuickEntry({ name: '  Kebab  w bułce ', kcal: '650', protein: '30,5', fat: '25', carbs: '70' })
    expect(r).toEqual({ ok: true, name: 'Kebab w bułce', macros: { kcal: 650, protein: 30.5, fat: 25, carbs: 70 } })
  })

  it('computes kcal from macros when kcal is empty', () => {
    const r = validateQuickEntry({ ...EMPTY_QUICK_ENTRY, protein: '10', fat: '10', carbs: '10' })
    expect(r.ok && r.macros.kcal).toBe(170)
  })

  it('requires kcal or macros', () => {
    const r = validateQuickEntry(EMPTY_QUICK_ENTRY)
    expect(!r.ok && r.errors.kcal).toBe('Podaj kalorie lub makroskładniki.')
  })

  it('rejects invalid values', () => {
    const r = validateQuickEntry({ ...EMPTY_QUICK_ENTRY, kcal: '0', protein: '-1', fat: 'abc', carbs: '2000' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.kcal).toBeDefined()
      expect(r.errors.protein).toBe('Wartość nie może być ujemna.')
      expect(r.errors.fat).toBe('Niepoprawna liczba.')
      expect(r.errors.carbs).toBe('Maksymalnie 1000 g.')
    }
    const r2 = validateQuickEntry({ ...EMPTY_QUICK_ENTRY, kcal: '10001' })
    expect(!r2.ok && r2.errors.kcal).toBe('Maksymalnie 10000 kcal.')
  })
})

describe('quickEntryToFormValues', () => {
  it('shows zero macros as empty fields and uses decimal comma', () => {
    expect(quickEntryToFormValues('X', { kcal: 250.5, protein: 0, fat: 3.2, carbs: 0 })).toEqual({
      name: 'X',
      kcal: '250,5',
      protein: '',
      fat: '3,2',
      carbs: '',
    })
  })
})
