import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DEFAULT_GOALS, DEFAULT_MEALS } from '@/constants'
import { getLastBackupAt } from '@/db/repositories/backup'
import { getGoals, getMeals, saveGoals, saveMeals } from '@/db/repositories/settings'
import type { Goals, MealSetting } from '@/types'

export const settingsKeys = {
  all: ['settings'] as const,
  goals: () => [...settingsKeys.all, 'goals'] as const,
  meals: () => [...settingsKeys.all, 'meals'] as const,
  lastBackup: () => [...settingsKeys.all, 'lastBackup'] as const,
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

export function useLastBackupAt() {
  return useQuery({ queryKey: settingsKeys.lastBackup(), queryFn: getLastBackupAt })
}

export function useSaveGoals() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (goals: Goals) => saveGoals(goals),
    onSuccess: (_d, goals) => {
      queryClient.setQueryData(settingsKeys.goals(), goals)
      void queryClient.invalidateQueries({ queryKey: settingsKeys.goals() })
    },
  })
}

export function useSaveMeals() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (meals: MealSetting[]) => saveMeals(meals),
    onSuccess: (_d, meals) => {
      queryClient.setQueryData(settingsKeys.meals(), meals)
      void queryClient.invalidateQueries({ queryKey: settingsKeys.meals() })
    },
  })
}
