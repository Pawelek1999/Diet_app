import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEntry,
  deleteEntry,
  getEntry,
  listEntriesForDay,
  listRecentEntries,
  updateEntry,
} from '@/db/repositories/entries'
import type { EntryInput } from '@/types'

export const entryKeys = {
  all: ['entries'] as const,
  day: (date: string) => [...entryKeys.all, 'day', date] as const,
  recent: () => [...entryKeys.all, 'recent'] as const,
  detail: (id: number) => [...entryKeys.all, 'detail', id] as const,
}

export function useDayEntries(date: string) {
  return useQuery({ queryKey: entryKeys.day(date), queryFn: () => listEntriesForDay(date) })
}

export function useRecentEntries() {
  return useQuery({ queryKey: entryKeys.recent(), queryFn: () => listRecentEntries(100) })
}

export function useEntry(id: number | null) {
  return useQuery({
    queryKey: entryKeys.detail(id ?? -1),
    queryFn: () => getEntry(id as number),
    enabled: id !== null,
  })
}

export function useCreateEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: EntryInput) => createEntry(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: entryKeys.all }),
  })
}

export function useUpdateEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: EntryInput }) => updateEntry(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: entryKeys.all }),
  })
}

export function useDeleteEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteEntry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: entryKeys.all }),
  })
}
