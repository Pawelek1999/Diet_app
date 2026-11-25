import { check, maybe, must, supabase } from '@/db/supabase'
import type { Dish, DishInput } from '@/types'

const COLUMNS =
  'id, name, servings, cooked_weight_grams, is_favorite, created_at, updated_at, dish_ingredients(product_id, grams, position)'

type DishRowWithIngredients = {
  id: number
  name: string
  servings: number
  cooked_weight_grams: number | null
  is_favorite: boolean
  created_at: string
  updated_at: string
  dish_ingredients: { product_id: number; grams: number; position: number }[]
}

function mapDish(row: DishRowWithIngredients): Dish {
  return {
    id: row.id,
    name: row.name,
    servings: Number(row.servings),
    cookedWeightGrams: row.cooked_weight_grams === null ? null : Number(row.cooked_weight_grams),
    isFavorite: row.is_favorite,
    ingredients: [...row.dish_ingredients]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ productId: i.product_id, grams: Number(i.grams) })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listDishes(): Promise<Dish[]> {
  const rows = must(await supabase.from('dishes').select(COLUMNS).is('deleted_at', null))
  return rows.map(mapDish).sort((a, b) => a.name.localeCompare(b.name, 'pl'))
}

/** Dish by id — includes soft-deleted ones (entries may still reference them). */
export async function getDish(id: number): Promise<Dish | null> {
  const row = maybe(await supabase.from('dishes').select(COLUMNS).eq('id', id).maybeSingle())
  return row ? mapDish(row) : null
}

/** Creates (id = null) or updates a dish with its ingredients in one transaction. Returns the id. */
export async function saveDish(id: number | null, input: DishInput): Promise<number> {
  return must(
    await supabase.rpc('save_dish', {
      p_id: id,
      p_name: input.name.trim(),
      p_servings: input.servings,
      p_cooked_weight_grams: input.cookedWeightGrams,
      p_is_favorite: input.isFavorite,
      p_ingredients: input.ingredients.map((i) => ({ product_id: i.productId, grams: i.grams })),
    }),
  )
}

export async function setDishFavorite(id: number, isFavorite: boolean): Promise<void> {
  check(await supabase.from('dishes').update({ is_favorite: isFavorite }).eq('id', id))
}

/** Soft delete: entries keep referencing the dish. */
export async function deleteDish(id: number): Promise<void> {
  check(await supabase.from('dishes').update({ deleted_at: new Date().toISOString() }).eq('id', id))
}
