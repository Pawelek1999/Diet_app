import { useQuery } from '@tanstack/react-query'
import { DEFAULT_GOALS, DEFAULT_MEALS } from '@/constants'
import { getGoals, getMeals } from '@/db/repositories/settings'

export const settingsKeys = {
  all: ['settings'] as const,
  goals: () => [...settingsKeys.all, 'goals'] as const,
  meals: () => [...settingsKeys.all, 'meals'] as const,
}

/** Daily goals (defaults while loading or when not set yet). */
export function useGoals() {
  return useQuery({ queryKey: settingsKeys.goals(), queryFn: getGoals, placeholderData: DEFAULT_GOALS, staleTime: 5 * 60_000 })
}

/** Meal order/visibility (defaults while loading or when not set yet). */
export function useMeals() {
  return useQuery({
    queryKey: settingsKeys.meals(),
    queryFn: getMeals,
    placeholderData: [...DEFAULT_MEALS],
    staleTime: 5 * 60_000,
  })
}
