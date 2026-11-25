// Domain types (camelCase). Database rows are mapped to these in src/db/repositories.

export type Macros = {
  kcal: number
  protein: number
  fat: number
  carbs: number
}

export type MealId = 'breakfast' | 'second_breakfast' | 'lunch' | 'snack_pm' | 'dinner' | 'snack'

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
export type DishNutrition =
  | {
      mode: 'ingredients'
      servings: number
      cookedWeightGrams: number | null
      ingredients: DishIngredient[]
    }
  | {
      mode: 'manual'
      /** Nutrition of ONE serving */
      perServing: Macros
    }

export type DishInput = {
  name: string
  description: string | null
  notes: string | null
  recipeUrl: string | null
  isFavorite: boolean
} & DishNutrition

export type Dish = DishInput & {
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
}
