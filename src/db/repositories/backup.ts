import type { Json } from '@/db/database.types'
import { check, maybe, must, supabase } from '@/db/supabase'
import { BACKUP_VERSION, type Backup, type BackupSummary } from '@/lib/backup'

const PAGE = 1000 // Supabase returns at most 1000 rows per request (api.max_rows)

type Table = 'products' | 'dishes' | 'dish_ingredients' | 'entries' | 'settings' | 'activity'

/** Fetches all rows of a table page by page (RLS limits it to the current user). */
async function fetchAll<T>(table: Table, columns: string, orderBy: string): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const page = must(
      await supabase
        .from(table)
        .select(columns)
        .order(orderBy)
        .range(from, from + PAGE - 1),
    ) as unknown as T[]
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}

/** Collects all of the user's data into a backup object (including soft-deleted items). */
export async function exportBackup(): Promise<Backup> {
  const [products, dishes, dishIngredients, entries, settings, activity] = await Promise.all([
    fetchAll<Backup['products'][number]>(
      'products',
      'id, name, kcal_100g, protein_100g, fat_100g, carbs_100g, serving_name, serving_grams, barcode, is_favorite, created_at, updated_at, deleted_at',
      'id',
    ),
    fetchAll<Backup['dishes'][number]>(
      'dishes',
      'id, name, mode, servings, cooked_weight_grams, kcal, protein, fat, carbs, description, notes, recipe_url, is_favorite, created_at, updated_at, deleted_at',
      'id',
    ),
    fetchAll<Backup['dish_ingredients'][number]>('dish_ingredients', 'dish_id, product_id, grams, position', 'id'),
    fetchAll<Backup['entries'][number]>(
      'entries',
      'date, meal, source_type, product_id, dish_id, name, amount, unit, kcal, protein, fat, carbs, created_at',
      'id',
    ),
    fetchAll<Backup['settings'][number]>('settings', 'key, value', 'key'),
    fetchAll<NonNullable<Backup['activity']>[number]>('activity', 'date, active_kcal, source, updated_at', 'date'),
  ])
  return {
    app: 'kalorie',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    products,
    dishes,
    dish_ingredients: dishIngredients,
    entries,
    settings,
    activity,
  }
}

/** Replaces ALL of the user's data with the backup (one transaction on the server). */
export async function importBackup(backup: Backup): Promise<Pick<BackupSummary, 'products' | 'dishes' | 'entries'>> {
  const result = must(await supabase.rpc('import_backup', { p_data: backup as unknown as Json }))
  const r = result as { products?: number; dishes?: number; entries?: number }
  return { products: r.products ?? 0, dishes: r.dishes ?? 0, entries: r.entries ?? 0 }
}

const LAST_BACKUP_KEY = 'lastBackupAt'

export async function getLastBackupAt(): Promise<string | null> {
  const row = maybe(await supabase.from('settings').select('value').eq('key', LAST_BACKUP_KEY).maybeSingle())
  return typeof row?.value === 'string' ? row.value : null
}

export async function setLastBackupAt(iso: string): Promise<void> {
  check(await supabase.from('settings').upsert({ key: LAST_BACKUP_KEY, value: iso }, { onConflict: 'user_id,key' }))
}
