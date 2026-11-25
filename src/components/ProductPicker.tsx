import { useEffect, useMemo, useRef, useState } from 'react'
import { QueryState } from '@/components/QueryState'
import { SearchInput } from '@/components/SearchInput'
import { useProducts } from '@/hooks/useProducts'
import { formatKcal, matchesSearch } from '@/lib/format'
import type { Product } from '@/types'

type Props = {
  onPick: (product: Product) => void
  onClose: () => void
}

/** Full-screen product chooser with search (used by the dish editor). */
export function ProductPicker({ onPick, onClose }: Props) {
  const products = useProducts()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const filtered = useMemo(() => {
    const list = (products.data ?? []).filter((p) => matchesSearch(p.name, query))
    // Favorites first, then alphabetical (already sorted by the repository).
    return [...list].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite))
  }, [products.data, query])

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Wybierz produkt">
      <div className="sheet-header">
        <h2 className="sheet-title">Wybierz produkt</h2>
        <button type="button" className="button button-secondary button-small" onClick={onClose}>
          Zamknij
        </button>
      </div>
      <SearchInput value={query} onChange={setQuery} placeholder="Szukaj produktu" inputRef={inputRef} />
      <div className="sheet-body">
        <QueryState isLoading={products.isLoading} error={products.error} onRetry={() => products.refetch()} />
        {products.data && filtered.length === 0 && <p className="empty">Brak wyników.</p>}
        <ul className="list">
          {filtered.map((p) => (
            <li key={p.id} className="list-row">
              <button type="button" className="list-row-link list-row-button" onClick={() => onPick(p)}>
                <span className="list-row-main">
                  <span className="list-row-title">
                    {p.isFavorite && <span aria-label="ulubiony">★ </span>}
                    {p.name}
                  </span>
                </span>
                <span className="list-row-value">
                  {formatKcal(p.per100g.kcal)}
                  <span className="list-row-hint">kcal/100 g</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
