// Domain types (camelCase). Database rows are mapped to these in src/db/repositories.

export type Macros = {
  kcal: number
  protein: number
  fat: number
  carbs: number
}

/** Built-in meals. Users can add custom meals with ids like "custom_k3j9x2ab". */
export type DefaultMealId = 'breakfast' | 'second_breakfast' | 'lunch' | 'snack_pm' | 'dinner' | 'snack'

/** Meal id: a DefaultMealId or a custom id (^custom_[a-z0-9]+$). */
export type MealId = string

export type Unit = 'g' | 'serving'

export type Product = {
  id: number
  name: string
  /** Nutrition values per 100 g */
  per100g: Macros
  servingName: string | null
  servingGrams: number | null
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}

export type ProductInput = {
  name: string
  per100g: Macros
  servingName: string | null
  servingGrams: number | null
  isFavorite: boolean
}

export type DishIngredient = {
  productId: number
  grams: number
}

/**
 * 'ingredients': nutrition computed from ingredients (servings, cookedWeightGrams apply).
 * 'manual': nutrition entered by hand per serving (like the user's old spreadsheet).
 */
export type DishNutrition<I extends DishIngredient = DishIngredient> =
  | {
      mode: 'ingredients'
      servings: number
      cookedWeightGrams: number | null
      ingredients: I[]
    }
  | {
      mode: 'manual'
      /** Nutrition of ONE serving */
      perServing: Macros
    }

/** Ingredient as read from the DB, with the product's current name and values (even if soft-deleted). */
export type DishIngredientWithProduct = DishIngredient & {
  productName: string
  per100g: Macros
}

type DishCommon = {
  name: string
  description: string | null
  notes: string | null
  recipeUrl: string | null
  isFavorite: boolean
}

export type DishInput = DishCommon & DishNutrition

export type Dish = DishCommon &
  DishNutrition<DishIngredientWithProduct> & {
    id: number
    createdAt: string
    updatedAt: string
  }

export type EntrySource =
  | { sourceType: 'product'; productId: number }
  | { sourceType: 'dish'; dishId: number }
  | { sourceType: 'quick' }

export type Entry = {
  id: number
  /** YYYY-MM-DD */
  date: string
  meal: MealId
  name: string
  amount: number
  unit: Unit
  /** Snapshot of nutrition for this amount */
  macros: Macros
  createdAt: string
} & EntrySource

export type EntryInput = {
  date: string
  meal: MealId
  name: string
  amount: number
  unit: Unit
  macros: Macros
} & EntrySource

export type Goals = Macros

export type MealSetting = {
  id: MealId
  label: string
  visible: boolean
  /** true for meals added by the user (can be deleted) */
  custom: boolean
}

export type ActivitySource = 'shortcut' | 'manual'

/** Active kcal burned on a day (from Garmin via the iOS shortcut, or entered manually). */
export type Activity = {
  /** YYYY-MM-DD */
  date: string
  activeKcal: number
  source: ActivitySource
  updatedAt: string
}

export type ActivitySettings = {
  /** Add burned kcal to the daily goal */
  addToGoal: boolean
  /** How much of the burned kcal is added (0–100 %) */
  percent: number
  /** Name of the iOS shortcut started by "Odśwież z Garmina" */
  shortcutName: string
}
