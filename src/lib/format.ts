// Polish number formatting/parsing and search normalization. Pure functions.

const kcalFormatter = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 })
const macroFormatter = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
const amountFormatter = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

/** Normalize Intl output: non-breaking/narrow spaces → regular spaces (stable for UI and tests). */
function normalizeSpaces(s: string): string {
  return s.replace(/[  ]/g, ' ')
}

/** kcal rounded to an integer, e.g. 1234.6 → "1 235". */
export function formatKcal(value: number): string {
  return normalizeSpaces(kcalFormatter.format(Math.round(value) === 0 ? 0 : value))
}

/** Macro grams with at most one decimal, e.g. 12.345 → "12,3". */
export function formatMacro(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return normalizeSpaces(macroFormatter.format(rounded === 0 ? 0 : rounded))
}

/** Amounts (grams, servings) with at most two decimals, e.g. 1.5 → "1,5". */
export function formatAmount(value: number): string {
  return normalizeSpaces(amountFormatter.format(value))
}

/**
 * Parse a user-entered decimal number. Accepts comma or dot as decimal separator,
 * spaces as thousands separators. Returns null for empty or invalid input.
 */
export function parseDecimal(input: string): number | null {
  const s = input.trim().replace(/[\s  ]/g, '').replace(',', '.')
  if (s === '' || !/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/**
 * Normalize text for search: lowercase, strip Polish diacritics, collapse whitespace,
 * trim punctuation that iOS dictation adds ("Żółty ser." → "zolty ser").
 */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.,!?;:"'„”«»()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalize a recipe link: trims, adds https:// when the scheme is missing,
 * returns null for empty input and for non-http(s) links (e.g. javascript:).
 */
export function normalizeRecipeUrl(input: string): string | null {
  const s = input.trim()
  if (s === '') return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`
  try {
    const url = new URL(withScheme)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

/** True if every word of the query appears in the text (order-independent). */
export function matchesSearch(text: string, query: string): boolean {
  const q = normalizeForSearch(query)
  if (q === '') return true
  const t = normalizeForSearch(text)
  return q.split(' ').every((word) => t.includes(word))
}
