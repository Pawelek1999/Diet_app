// Backup file format (JSON) and its validation. Pure functions.
// Rows use database column names (snake_case) without user_id, so import can be done in SQL.

export const BACKUP_VERSION = 1

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

export type BackupProduct = {
  id: number
  name: string
  kcal_100g: number
  protein_100g: number
  fat_100g: number
  carbs_100g: number
  serving_name: string | null
  serving_grams: number | null
  is_favorite: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type BackupDish = {
  id: number
  name: string
  mode: string
  servings: number
  cooked_weight_grams: number | null
  kcal: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  description: string | null
  notes: string | null
  recipe_url: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type BackupDishIngredient = { dish_id: number; product_id: number; grams: number; position: number }

export type BackupEntry = {
  date: string
  meal: string
  source_type: string
  product_id: number | null
  dish_id: number | null
  name: string
  amount: number
  unit: string
  kcal: number
  protein: number
  fat: number
  carbs: number
  created_at: string
}

export type BackupSetting = { key: string; value: Json }

export type Backup = {
  app: 'kalorie'
  version: typeof BACKUP_VERSION
  exportedAt: string
  products: BackupProduct[]
  dishes: BackupDish[]
  dish_ingredients: BackupDishIngredient[]
  entries: BackupEntry[]
  settings: BackupSetting[]
}

export type BackupSummary = {
  products: number
  dishes: number
  entries: number
  firstDate: string | null
  lastDate: string | null
}

export function backupFileName(date: string): string {
  return `kalorie-backup-${date}.json`
}

export function summarizeBackup(b: Pick<Backup, 'products' | 'dishes' | 'entries'>): BackupSummary {
  const dates = b.entries.map((e) => e.date).sort()
  return {
    products: b.products.filter((p) => p.deleted_at === null).length,
    dishes: b.dishes.filter((d) => d.deleted_at === null).length,
    entries: b.entries.length,
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
  }
}

// --- validation -------------------------------------------------------------

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isNonNeg = (v: unknown) => isNum(v) && v >= 0
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNullable = (v: unknown, check: (x: unknown) => boolean) => v === null || v === undefined || check(v)
const isDay = (v: unknown) => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v)

const MEALS = ['breakfast', 'second_breakfast', 'lunch', 'snack_pm', 'dinner', 'snack']

function checkArray(data: Obj, key: string, check: (row: Obj) => string | null): string | null {
  const arr = data[key]
  if (arr === undefined) return null
  if (!Array.isArray(arr)) return `Pole „${key}" musi być listą.`
  for (let i = 0; i < arr.length; i++) {
    const row: unknown = arr[i]
    if (!isObj(row)) return `${key}[${i}]: niepoprawny wiersz.`
    const err = check(row)
    if (err) return `${key}[${i}]: ${err}`
  }
  return null
}

/** Validates a parsed backup file. Never trusts the input: checks types and references. */
export function validateBackup(data: unknown): { ok: true; backup: Backup } | { ok: false; error: string } {
  if (!isObj(data)) return { ok: false, error: 'To nie jest plik kopii zapasowej.' }
  if (data.app !== 'kalorie') return { ok: false, error: 'To nie jest kopia zapasowa aplikacji Kalorie.' }
  if (data.version !== BACKUP_VERSION) return { ok: false, error: `Nieobsługiwana wersja kopii (${String(data.version)}).` }

  const errors = [
    checkArray(data, 'products', (r) =>
      !isNum(r.id) ? 'brak id'
      : !isStr(r.name) || r.name.trim() === '' ? 'brak nazwy'
      : !isNonNeg(r.kcal_100g) ? 'niepoprawne kcal'
      : ![r.protein_100g, r.fat_100g, r.carbs_100g].every((v) => isNullable(v, isNonNeg)) ? 'niepoprawne makro'
      : !isNullable(r.serving_grams, (v) => isNum(v) && v > 0) ? 'niepoprawna porcja'
      : null,
    ),
    checkArray(data, 'dishes', (r) =>
      !isNum(r.id) ? 'brak id'
      : !isStr(r.name) || r.name.trim() === '' ? 'brak nazwy'
      : r.mode !== 'manual' && r.mode !== 'ingredients' ? 'niepoprawny tryb'
      : r.mode === 'manual' && ![r.kcal, r.protein, r.fat, r.carbs].every(isNonNeg) ? 'brak makro'
      : !isNullable(r.servings, (v) => isNum(v) && v > 0) ? 'niepoprawna liczba porcji'
      : !isNullable(r.recipe_url, (v) => isStr(v) && /^https?:\/\//i.test(v)) ? 'niepoprawny link'
      : null,
    ),
    checkArray(data, 'dish_ingredients', (r) =>
      !isNum(r.dish_id) || !isNum(r.product_id) ? 'brak odwołania'
      : !isNum(r.grams) || r.grams <= 0 ? 'niepoprawne gramy'
      : null,
    ),
    checkArray(data, 'entries', (r) =>
      !isDay(r.date) ? 'niepoprawna data'
      : !isStr(r.meal) || !MEALS.includes(r.meal) ? 'niepoprawny posiłek'
      : !isStr(r.name) ? 'brak nazwy'
      : !isNum(r.amount) || r.amount <= 0 ? 'niepoprawna ilość'
      : r.unit !== 'g' && r.unit !== 'serving' ? 'niepoprawna jednostka'
      : !isNonNeg(r.kcal) ? 'niepoprawne kcal'
      : r.source_type === 'product' ? (isNum(r.product_id) && isNullable(r.dish_id, () => false) ? null : 'niespójne źródło')
      : r.source_type === 'dish' ? (isNum(r.dish_id) && isNullable(r.product_id, () => false) ? null : 'niespójne źródło')
      : r.source_type === 'quick' ? (isNullable(r.product_id, () => false) && isNullable(r.dish_id, () => false) ? null : 'niespójne źródło')
      : 'niepoprawny typ wpisu',
    ),
    checkArray(data, 'settings', (r) => (!isStr(r.key) ? 'brak klucza' : r.value === undefined ? 'brak wartości' : null)),
  ].filter((e): e is string => e !== null)
  if (errors.length > 0) return { ok: false, error: `Plik jest uszkodzony: ${errors[0]}` }

  const backup = {
    app: 'kalorie',
    version: BACKUP_VERSION,
    exportedAt: isStr(data.exportedAt) ? data.exportedAt : '',
    products: (data.products ?? []) as BackupProduct[],
    dishes: (data.dishes ?? []) as BackupDish[],
    dish_ingredients: (data.dish_ingredients ?? []) as BackupDishIngredient[],
    entries: (data.entries ?? []) as BackupEntry[],
    settings: (data.settings ?? []) as BackupSetting[],
  } satisfies Backup

  // Referential integrity
  const productIds = new Set(backup.products.map((p) => p.id))
  const dishIds = new Set(backup.dishes.map((d) => d.id))
  if (productIds.size !== backup.products.length || dishIds.size !== backup.dishes.length) {
    return { ok: false, error: 'Plik jest uszkodzony: powtórzone identyfikatory.' }
  }
  for (const i of backup.dish_ingredients) {
    if (!dishIds.has(i.dish_id) || !productIds.has(i.product_id)) {
      return { ok: false, error: 'Plik jest uszkodzony: składnik odwołuje się do nieistniejącego dania lub produktu.' }
    }
  }
  for (const e of backup.entries) {
    if ((e.product_id !== null && e.product_id !== undefined && !productIds.has(e.product_id)) ||
        (e.dish_id !== null && e.dish_id !== undefined && !dishIds.has(e.dish_id))) {
      return { ok: false, error: 'Plik jest uszkodzony: wpis odwołuje się do nieistniejącego produktu lub dania.' }
    }
  }

  return { ok: true, backup }
}

/** Parses the text of a backup file (JSON) and validates it. */
export function parseBackupFile(text: string): { ok: true; backup: Backup } | { ok: false; error: string } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Nie udało się odczytać pliku (to nie jest poprawny JSON).' }
  }
  return validateBackup(data)
}
