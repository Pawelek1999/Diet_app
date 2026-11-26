// Barcodes (EAN-8, EAN-13, UPC-A, UPC-E) and Open Food Facts product data. Pure functions.

/** Formats read by the scanner: food packaging codes only. */
export const SCAN_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const

/**
 * Normalizes a barcode typed or scanned by the user: digits only, 8–14 characters.
 * UPC-A (12 digits) becomes EAN-13 with a leading 0 — the same product scanned as either
 * format then matches the same saved product.
 */
export function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, '')
  if (!/^[0-9]{8,14}$/.test(digits)) return null
  return digits.length === 12 ? `0${digits}` : digits
}

/** Prefilled values for the product form (strings, like form inputs). */
export type OffProductValues = {
  name: string
  kcal: string
  protein: string
  fat: string
  carbs: string
  servingName: string
  servingGrams: string
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : ''
}

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** Value for a form input: max 1 decimal place, Polish decimal comma. */
function toInput(n: number | null): string {
  if (n === null) return ''
  return String(Math.round(n * 10) / 10).replace('.', ',')
}

/**
 * Maps an Open Food Facts API v2 response (/api/v2/product/{code}) to product form values.
 * Returns null when the product is unknown. Missing values stay empty for the user to fill in.
 */
export function parseOffProduct(json: unknown): OffProductValues | null {
  if (!isObj(json) || json.status !== 1 || !isObj(json.product)) return null
  const p = json.product
  const n = isObj(p.nutriments) ? p.nutriments : {}

  const baseName = str(p.product_name_pl) || str(p.product_name) || str(p.generic_name_pl) || str(p.generic_name)
  const brand = str(p.brands).split(',')[0]?.trim() ?? ''
  const name = baseName && brand && !baseName.toLowerCase().includes(brand.toLowerCase()) ? `${baseName} (${brand})` : baseName

  // kcal: prefer the kcal value; otherwise convert kJ (1 kcal = 4.184 kJ).
  const kcalDirect = num(n['energy-kcal_100g'])
  const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g'])
  const kcal = kcalDirect ?? (kj !== null ? kj / 4.184 : null)

  // Serving: only when its size is in grams (or ml, treated as grams).
  const unit = str(p.serving_quantity_unit).toLowerCase()
  const servingQty = unit === '' || unit === 'g' || unit === 'ml' ? num(p.serving_quantity) : null
  const hasServing = servingQty !== null && servingQty > 0 && servingQty <= 5000

  return {
    name,
    kcal: toInput(kcal),
    protein: toInput(num(n.proteins_100g)),
    fat: toInput(num(n.fat_100g)),
    carbs: toInput(num(n.carbohydrates_100g)),
    servingName: hasServing ? str(p.serving_size).slice(0, 40) || '1 porcja' : '',
    servingGrams: hasServing ? toInput(servingQty) : '',
  }
}
