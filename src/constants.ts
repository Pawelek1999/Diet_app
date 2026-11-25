import type { Goals, MealId, MealSetting } from '@/types'

export const MEAL_IDS: readonly MealId[] = [
  'breakfast',
  'second_breakfast',
  'lunch',
  'snack_pm',
  'dinner',
  'snack',
]

export const MEAL_LABELS: Record<MealId, string> = {
  breakfast: 'Śniadanie',
  second_breakfast: 'II śniadanie',
  lunch: 'Obiad',
  snack_pm: 'Podwieczorek',
  dinner: 'Kolacja',
  snack: 'Przekąska',
}

export const DEFAULT_MEALS: readonly MealSetting[] = MEAL_IDS.map((id) => ({
  id,
  label: MEAL_LABELS[id],
  visible: true,
}))

export const DEFAULT_GOALS: Goals = { kcal: 2200, protein: 140, fat: 70, carbs: 250 }

export const SETTINGS_KEYS = {
  goals: 'goals',
  meals: 'meals',
  activity: 'activity',
} as const
