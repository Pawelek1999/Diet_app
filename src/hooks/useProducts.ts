import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  setProductFavorite,
  updateProduct,
} from '@/db/repositories/products'
import type { Product, ProductInput } from '@/types'

export const productKeys = {
  all: ['products'] as const,
  list: () => [...productKeys.all, 'list'] as const,
  detail: (id: number) => [...productKeys.all, 'detail', id] as const,
}

export function useProducts() {
  return useQuery({ queryKey: productKeys.list(), queryFn: listProducts })
}

export function useProduct(id: number | null) {
  return useQuery({
    queryKey: productKeys.detail(id ?? -1),
    queryFn: () => getProduct(id as number),
    enabled: id !== null,
  })
}

/** Create (id = null) or update a product. */
export function useSaveProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: ProductInput }): Promise<Product> =>
      id === null ? createProduct(input) : updateProduct(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}

/** Optimistic favorite toggle on the list. */
export function useToggleProductFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: number; isFavorite: boolean }) =>
      setProductFavorite(id, isFavorite),
    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: productKeys.list() })
      const previous = queryClient.getQueryData<Product[]>(productKeys.list())
      queryClient.setQueryData<Product[]>(productKeys.list(), (old) =>
        old?.map((p) => (p.id === id ? { ...p, isFavorite } : p)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(productKeys.list(), context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}
