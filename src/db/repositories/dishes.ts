import { check, maybe, must, supabase } from '@/db/supabase'
import type { Dish, DishInput, DishNutrition } from '@/types'

const COLUMNS =
  'id, name, mode, servings, cooked_weight_grams, kcal, protein, fat, carbs, description, notes, recipe_url, is_favorite, created_at, updated_at, dish_ingredients(product_id, grams, position)'

type DishRowWithIngredients = {
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
  dish_ingredients: { product_id: number; grams: number; position: number }[]
}

function mapNutrition(row: DishRowWithIngredients): DishNutrition {
  if (row.mode === 'manual') {
    return {
      mode: 'manual',
      perServing: {
        kcal: Number(row.kcal ?? 0),
        protein: Number(row.protein ?? 0),
        fat: Number(row.fat ?? 0),
        carbs: Number(row.carbs ?? 0),
      },
    }
  }
  return {
    mode: 'ingredients',
    servings: Number(row.servings),
    cookedWeightGrams: row.cooked_weight_grams === null ? null : Number(row.cooked_weight_grams),
    ingredients: [...row.dish_ingredients]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ productId: i.product_id, grams: Number(i.grams) })),
  }
}

function mapDish(row: DishRowWithIngredients): Dish {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    notes: row.notes,
    recipeUrl: row.recipe_url,
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...mapNutrition(row),
  }
}

/** Payload for the save_dish RPC (p_dish, p_ingredients). */
function toPayload(input: DishInput) {
  const common = {
    name: input.name.trim(),
    description: input.description,
    notes: input.notes,
    recipe_url: input.recipeUrl,
    is_favorite: input.isFavorite,
  }
  if (input.mode === 'manual') {
    return {
      dish: {
        ...common,
        mode: 'manual',
        servings: 1,
        cooked_weight_grams: null,
        kcal: input.perServing.kcal,
        protein: input.perServing.protein,
        fat: input.perServing.fat,
        carbs: input.perServing.carbs,
      },
      ingredients: [],
    }
  }
  return {
    dish: {
      ...common,
      mode: 'ingredients',
      servings: input.servings,
      cooked_weight_grams: input.cookedWeightGrams,
      kcal: null,
      protein: null,
      fat: null,
      carbs: null,
    },
    ingredients: input.ingredients.map((i) => ({ product_id: i.productId, grams: i.grams })),
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
  const payload = toPayload(input)
  return must(
    await supabase.rpc('save_dish', {
      // null = create a new dish (the type generator cannot express nullable function args)
      p_id: id as number,
      p_dish: payload.dish,
      p_ingredients: payload.ingredients,
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
