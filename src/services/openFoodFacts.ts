import { parseOffProduct, type OffProductValues } from '@/lib/barcode'

// Open Food Facts public API (no key, CORS allowed). Read-only lookup by barcode.
const FIELDS = [
  'product_name',
  'product_name_pl',
  'generic_name',
  'generic_name_pl',
  'brands',
  'nutriments',
  'serving_size',
  'serving_quantity',
  'serving_quantity_unit',
].join(',')

/** Product values from Open Food Facts, or null when the barcode is unknown there. Throws on network errors. */
export async function fetchOffProduct(barcode: string, signal?: AbortSignal): Promise<OffProductValues | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`
  const res = await fetch(url, { signal })
  // Unknown products come back as 404 with { status: 0 }.
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Open Food Facts: błąd ${res.status}`)
  return parseOffProduct(await res.json())
}
