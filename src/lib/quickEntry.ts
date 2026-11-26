import { parseDecimal } from '@/lib/format'
import { kcalFromMacros } from '@/lib/nutrition'
import type { Macros } from '@/types'

// Quick entry form (kcal + optional macros, no product): raw strings ↔ validated values. Pure functions.

export const QUICK_ENTRY_DEFAULT_NAME = 'Szybki wpis'
const MAX_KCAL = 10000
const MAX_MACRO_G = 1000

export type QuickEntryValues = {
  name: string
  kcal: string
  protein: string
  fat: string
  carbs: string
}

export type QuickEntryErrors = Partial<Record<keyof QuickEntryValues, string>>

export type QuickEntryResult =
  | { ok: true; name: string; macros: Macros }
  | { ok: false; errors: QuickEntryErrors }

export const EMPTY_QUICK_ENTRY: QuickEntryValues = { name: '', kcal: '', protein: '', fat: '', carbs: '' }

/** Exact value for an input field; zero macros shown as empty. */
function toInput(n: number): string {
  return n === 0 ? '' : String(n).replace('.', ',')
}

export function quickEntryToFormValues(name: string, m: Macros): QuickEntryValues {
  return {
    name,
    kcal: toInput(m.kcal),
    protein: toInput(m.protein),
    fat: toInput(m.fat),
    carbs: toInput(m.carbs),
  }
}

function parseMacro(raw: string): { value: number } | { error: string } {
  if (raw.trim() === '') return { value: 0 }
  const n = parseDecimal(raw)
  if (n === null) return { error: 'Niepoprawna liczba.' }
  if (n < 0) return { error: 'Wartość nie może być ujemna.' }
  if (n > MAX_MACRO_G) return { error: `Maksymalnie ${MAX_MACRO_G} g.` }
  return { value: n }
}

/**
 * kcal required (> 0, ≤ 10000), macros optional (empty → 0).
 * Empty kcal with some macros → kcal computed from macros (4/9/4).
 */
export function validateQuickEntry(v: QuickEntryValues): QuickEntryResult {
  const errors: QuickEntryErrors = {}

  const protein = parseMacro(v.protein)
  const fat = parseMacro(v.fat)
  const carbs = parseMacro(v.carbs)
  if ('error' in protein) errors.protein = protein.error
  if ('error' in fat) errors.fat = fat.error
  if ('error' in carbs) errors.carbs = carbs.error

  let kcal: number | null = null
  if (v.kcal.trim() === '') {
    if ('value' in protein && 'value' in fat && 'value' in carbs) {
      const computed = kcalFromMacros({ protein: protein.value, fat: fat.value, carbs: carbs.value })
      if (computed > 0 && computed <= MAX_KCAL) kcal = computed
      else if (computed > MAX_KCAL) errors.kcal = `Maksymalnie ${MAX_KCAL} kcal.`
      else errors.kcal = 'Podaj kalorie lub makroskładniki.'
    }
  } else {
    const n = parseDecimal(v.kcal)
    if (n === null || n <= 0) errors.kcal = 'Podaj liczbę kalorii większą od 0.'
    else if (n > MAX_KCAL) errors.kcal = `Maksymalnie ${MAX_KCAL} kcal.`
    else kcal = n
  }

  if (kcal === null || !('value' in protein) || !('value' in fat) || !('value' in carbs)) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    name: v.name.trim().replace(/\s+/g, ' ') || QUICK_ENTRY_DEFAULT_NAME,
    macros: { kcal, protein: protein.value, fat: fat.value, carbs: carbs.value },
  }
}
