import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteDish, getDish, listDishes, saveDish, setDishFavorite } from '@/db/repositories/dishes'
import type { Dish, DishInput } from '@/types'

export const dishKeys = {
  all: ['dishes'] as const,
  list: () => [...dishKeys.all, 'list'] as const,
  detail: (id: number) => [...dishKeys.all, 'detail', id] as const,
}

export function useDishes() {
  return useQuery({ queryKey: dishKeys.list(), queryFn: listDishes })
}

export function useDish(id: number | null) {
  return useQuery({
    queryKey: dishKeys.detail(id ?? -1),
    queryFn: () => getDish(id as number),
    enabled: id !== null,
  })
}

/** Create (id = null) or update a dish. Resolves to the dish id. */
export function useSaveDish() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: DishInput }) => saveDish(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dishKeys.all }),
  })
}

export function useDeleteDish() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteDish(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dishKeys.all }),
  })
}

/** Optimistic favorite toggle (list and detail). */
export function useToggleDishFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: number; isFavorite: boolean }) => setDishFavorite(id, isFavorite),
    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: dishKeys.all })
      const previousList = queryClient.getQueryData<Dish[]>(dishKeys.list())
      const previousDetail = queryClient.getQueryData<Dish | null>(dishKeys.detail(id))
      queryClient.setQueryData<Dish[]>(dishKeys.list(), (old) =>
        old?.map((d) => (d.id === id ? { ...d, isFavorite } : d)),
      )
      queryClient.setQueryData<Dish | null>(dishKeys.detail(id), (old) => (old ? { ...old, isFavorite } : old))
      return { previousList, previousDetail }
    },
    onError: (_err, { id }, context) => {
      if (context?.previousList) queryClient.setQueryData(dishKeys.list(), context.previousList)
      if (context?.previousDetail !== undefined) queryClient.setQueryData(dishKeys.detail(id), context.previousDetail)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: dishKeys.all }),
  })
}
