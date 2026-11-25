import { check, maybe, must, supabase } from '@/db/supabase'
import type { Database } from '@/db/database.types'
import type { Entry, EntryInput, MealId, Unit } from '@/types'

type EntryRow = Database['public']['Tables']['entries']['Row']

const COLUMNS =
  'id, date, meal, source_type, product_id, dish_id, name, amount, unit, kcal, protein, fat, carbs, created_at'

function mapEntry(row: Omit<EntryRow, 'user_id'>): Entry {
  const base = {
    id: row.id,
    date: row.date,
    meal: row.meal as MealId,
    name: row.name,
    amount: Number(row.amount),
    unit: row.unit as Unit,
    macros: {
      kcal: Number(row.kcal),
      protein: Number(row.protein),
      fat: Number(row.fat),
      carbs: Number(row.carbs),
    },
    createdAt: row.created_at,
  }
  if (row.source_type === 'product' && row.product_id !== null) {
    return { ...base, sourceType: 'product', productId: row.product_id }
  }
  if (row.source_type === 'dish' && row.dish_id !== null) {
    return { ...base, sourceType: 'dish', dishId: row.dish_id }
  }
  return { ...base, sourceType: 'quick' }
}

function toRow(input: EntryInput) {
  return {
    date: input.date,
    meal: input.meal,
    source_type: input.sourceType,
    product_id: input.sourceType === 'product' ? input.productId : null,
    dish_id: input.sourceType === 'dish' ? input.dishId : null,
    name: input.name,
    amount: input.amount,
    unit: input.unit,
    kcal: input.macros.kcal,
    protein: input.macros.protein,
    fat: input.macros.fat,
    carbs: input.macros.carbs,
  }
}

export async function listEntriesForDay(date: string): Promise<Entry[]> {
  const rows = must(
    await supabase.from('entries').select(COLUMNS).eq('date', date).order('created_at'),
  )
  return rows.map(mapEntry)
}

/** Entries in an inclusive date range (e.g. a week for history). */
export async function listEntriesInRange(from: string, to: string): Promise<Entry[]> {
  const rows = must(
    await supabase
      .from('entries')
      .select(COLUMNS)
      .gte('date', from)
      .lte('date', to)
      .order('date')
      .order('created_at'),
  )
  return rows.map(mapEntry)
}

/** Most recently logged distinct products/dishes (for "Ostatnio używane"). */
export async function listRecentEntries(limit = 50): Promise<Entry[]> {
  const rows = must(
    await supabase
      .from('entries')
      .select(COLUMNS)
      .neq('source_type', 'quick')
      .order('created_at', { ascending: false })
      .limit(limit),
  )
  return rows.map(mapEntry)
}

export async function getEntry(id: number): Promise<Entry | null> {
  const row = maybe(await supabase.from('entries').select(COLUMNS).eq('id', id).maybeSingle())
  return row ? mapEntry(row) : null
}

export async function createEntry(input: EntryInput): Promise<Entry> {
  const row = must(await supabase.from('entries').insert(toRow(input)).select(COLUMNS).single())
  return mapEntry(row)
}

export async function updateEntry(id: number, input: EntryInput): Promise<Entry> {
  const row = must(
    await supabase.from('entries').update(toRow(input)).eq('id', id).select(COLUMNS).single(),
  )
  return mapEntry(row)
}

export async function deleteEntry(id: number): Promise<void> {
  check(await supabase.from('entries').delete().eq('id', id))
}
