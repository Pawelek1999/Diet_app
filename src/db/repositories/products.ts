import { check, maybe, must, supabase } from '@/db/supabase'
import type { Database } from '@/db/database.types'
import type { Product, ProductInput } from '@/types'

type ProductRow = Database['public']['Tables']['products']['Row']

const COLUMNS =
  'id, name, kcal_100g, protein_100g, fat_100g, carbs_100g, serving_name, serving_grams, is_favorite, created_at, updated_at'

export function mapProduct(row: Omit<ProductRow, 'user_id' | 'deleted_at'>): Product {
  return {
    id: row.id,
    name: row.name,
    per100g: {
      kcal: Number(row.kcal_100g),
      protein: Number(row.protein_100g),
      fat: Number(row.fat_100g),
      carbs: Number(row.carbs_100g),
    },
    servingName: row.serving_name,
    servingGrams: row.serving_grams === null ? null : Number(row.serving_grams),
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(input: ProductInput) {
  return {
    name: input.name.trim(),
    kcal_100g: input.per100g.kcal,
    protein_100g: input.per100g.protein,
    fat_100g: input.per100g.fat,
    carbs_100g: input.per100g.carbs,
    serving_name: input.servingName?.trim() || null,
    serving_grams: input.servingGrams,
    is_favorite: input.isFavorite,
  }
}

/** All non-deleted products, sorted by name (Polish collation done client-side). */
export async function listProducts(): Promise<Product[]> {
  const rows = must(await supabase.from('products').select(COLUMNS).is('deleted_at', null))
  return rows.map(mapProduct).sort((a, b) => a.name.localeCompare(b.name, 'pl'))
}

/** Product by id — includes soft-deleted ones (entries may still reference them). */
export async function getProduct(id: number): Promise<Product | null> {
  const row = maybe(await supabase.from('products').select(COLUMNS).eq('id', id).maybeSingle())
  return row ? mapProduct(row) : null
}

export async function getProductsByIds(ids: readonly number[]): Promise<Product[]> {
  if (ids.length === 0) return []
  const rows = must(await supabase.from('products').select(COLUMNS).in('id', [...ids]))
  return rows.map(mapProduct)
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const row = must(await supabase.from('products').insert(toRow(input)).select(COLUMNS).single())
  return mapProduct(row)
}

export async function createProducts(inputs: readonly ProductInput[]): Promise<void> {
  if (inputs.length === 0) return
  check(await supabase.from('products').insert(inputs.map(toRow)))
}

export async function updateProduct(id: number, input: ProductInput): Promise<Product> {
  const row = must(
    await supabase.from('products').update(toRow(input)).eq('id', id).select(COLUMNS).single(),
  )
  return mapProduct(row)
}

export async function setProductFavorite(id: number, isFavorite: boolean): Promise<void> {
  check(await supabase.from('products').update({ is_favorite: isFavorite }).eq('id', id))
}

/** Soft delete: entries and dishes keep referencing the product. */
export async function deleteProduct(id: number): Promise<void> {
  check(
    await supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', id),
  )
}

export async function countProducts(): Promise<number> {
  const { count, error } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
  if (error) throw new Error(error.message)
  return count ?? 0
}
