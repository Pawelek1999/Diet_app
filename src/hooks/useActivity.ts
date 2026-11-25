import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DEFAULT_ACTIVITY_SETTINGS } from '@/constants'
import {
  createImportToken,
  deleteActivity,
  getActivity,
  getActivitySettings,
  getImportTokenCreatedAt,
  listActivityInRange,
  saveActivitySettings,
  saveManualActivity,
} from '@/db/repositories/activity'
import type { ActivitySettings } from '@/types'

export const activityKeys = {
  all: ['activity'] as const,
  day: (date: string) => [...activityKeys.all, 'day', date] as const,
  range: (from: string, to: string) => [...activityKeys.all, 'range', from, to] as const,
  settings: () => [...activityKeys.all, 'settings'] as const,
  token: () => [...activityKeys.all, 'token'] as const,
}

// staleTime 0: always refetch when the app regains focus (e.g. returning from the iOS shortcut).
export function useActivity(date: string) {
  return useQuery({ queryKey: activityKeys.day(date), queryFn: () => getActivity(date), staleTime: 0 })
}

export function useActivityRange(from: string, to: string) {
  return useQuery({ queryKey: activityKeys.range(from, to), queryFn: () => listActivityInRange(from, to), staleTime: 0 })
}

export function useActivitySettings() {
  return useQuery({
    queryKey: activityKeys.settings(),
    queryFn: getActivitySettings,
    placeholderData: DEFAULT_ACTIVITY_SETTINGS,
    staleTime: 5 * 60_000,
  })
}

export function useImportTokenCreatedAt() {
  return useQuery({ queryKey: activityKeys.token(), queryFn: getImportTokenCreatedAt })
}

export function useSaveManualActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ date, activeKcal }: { date: string; activeKcal: number }) => saveManualActivity(date, activeKcal),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: activityKeys.all }),
  })
}

export function useDeleteActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (date: string) => deleteActivity(date),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: activityKeys.all }),
  })
}

export function useSaveActivitySettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (s: ActivitySettings) => saveActivitySettings(s),
    onSuccess: (_d, s) => {
      queryClient.setQueryData(activityKeys.settings(), s)
      void queryClient.invalidateQueries({ queryKey: activityKeys.settings() })
    },
  })
}

export function useCreateImportToken() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createImportToken,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: activityKeys.token() }),
  })
}
