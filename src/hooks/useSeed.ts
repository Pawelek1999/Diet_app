import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { seedIfEmpty } from '@/db/seed'

/** Runs the starter-product seed once per session after login. */
export function useSeed(enabled: boolean) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['seed'],
    queryFn: seedIfEmpty,
    enabled,
    staleTime: Infinity,
    retry: 1,
  })

  useEffect(() => {
    if (query.data === true) void queryClient.invalidateQueries({ queryKey: ['products'] })
  }, [query.data, queryClient])
}
