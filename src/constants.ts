import type { ActivitySettings, DefaultMealId, Goals, MealSetting } from '@/types'

export const MEAL_IDS: readonly DefaultMealId[] = [
  'breakfast',
  'second_breakfast',
  'lunch',
  'snack_pm',
  'dinner',
  'snack',
]

export const MEAL_LABELS: Record<DefaultMealId, string> = {
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
  custom: false,
}))

export const MAX_MEALS = 12
export const MAX_MEAL_LABEL = 30

export const DEFAULT_GOALS: Goals = { kcal: 2200, protein: 140, fat: 70, carbs: 250 }

export const DEFAULT_ACTIVITY_SETTINGS: ActivitySettings = {
  addToGoal: false,
  percent: 100,
  shortcutName: 'Kalorie Garmin',
}

export const SETTINGS_KEYS = {
  goals: 'goals',
  meals: 'meals',
  activity: 'activity',
} as const
