import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { DishList } from '@/components/DishList'
import { FavoriteButton } from '@/components/FavoriteButton'
import { MacroLine } from '@/components/MacroLine'
import { QueryState } from '@/components/QueryState'
import { SearchInput } from '@/components/SearchInput'
import { useProducts, useToggleProductFavorite } from '@/hooks/useProducts'
import { formatKcal, matchesSearch } from '@/lib/format'

type Tab = 'products' | 'dishes'

export function FoodsScreen() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'dishes' ? 'dishes' : 'products'

  function setTab(next: Tab) {
    setParams(next === 'products' ? {} : { tab: next }, { replace: true })
  }

  return (
    <>
      <div className="title-row">
        <h1 className="screen-title">{tab === 'products' ? 'Produkty' : 'Dania'}</h1>
        <Link
          to={tab === 'products' ? '/product/new' : '/dish/new'}
          className="button button-primary button-small"
          aria-label={tab === 'products' ? 'Dodaj produkt' : 'Dodaj danie'}
        >
          + Dodaj
        </Link>
      </div>

      <div className="segmented" role="tablist" aria-label="Rodzaj">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'products'}
          className={tab === 'products' ? 'segmented-item active' : 'segmented-item'}
          onClick={() => setTab('products')}
        >
          Produkty
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'dishes'}
          className={tab === 'dishes' ? 'segmented-item active' : 'segmented-item'}
          onClick={() => setTab('dishes')}
        >
          Dania
        </button>
      </div>

      {tab === 'products' ? <ProductList /> : <DishList />}
    </>
  )
}

function ProductList() {
  const products = useProducts()
  const toggleFavorite = useToggleProductFavorite()
  const [query, setQuery] = useState('')
  const [onlyFavorites, setOnlyFavorites] = useState(false)

  const filtered = useMemo(
    () =>
      (products.data ?? []).filter(
        (p) => (!onlyFavorites || p.isFavorite) && matchesSearch(p.name, query),
      ),
    [products.data, query, onlyFavorites],
  )

  return (
    <>
      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Szukaj produktu" />
        <button
          type="button"
          className={onlyFavorites ? 'chip active' : 'chip'}
          aria-pressed={onlyFavorites}
          onClick={() => setOnlyFavorites((v) => !v)}
        >
          ★ Ulubione
        </button>
      </div>

      <QueryState isLoading={products.isLoading} error={products.error} onRetry={() => products.refetch()} />

      {products.data && filtered.length === 0 && (
        <div className="empty">
          {query || onlyFavorites ? (
            <p>Brak wyników.</p>
          ) : (
            <p>Nie masz jeszcze produktów.</p>
          )}
          <Link to="/product/new" className="button button-secondary">
            Dodaj produkt
          </Link>
        </div>
      )}

      {filtered.length > 0 && (
        <ul className="list" aria-label="Produkty">
          {filtered.map((p) => (
            <li key={p.id} className="list-row">
              <Link to={`/product/${p.id}`} className="list-row-link">
                <span className="list-row-main">
                  <span className="list-row-title">{p.name}</span>
                  <span className="list-row-sub">
                    <MacroLine macros={p.per100g} />
                  </span>
                </span>
                <span className="list-row-value">
                  {formatKcal(p.per100g.kcal)}
                  <span className="unit"> kcal</span>
                  <span className="list-row-hint">/100 g</span>
                </span>
              </Link>
              <FavoriteButton
                active={p.isFavorite}
                label={p.name}
                onToggle={() => toggleFavorite.mutate({ id: p.id, isFavorite: !p.isFavorite })}
              />
            </li>
          ))}
        </ul>
      )}

      {products.data && (
        <p className="muted small list-footer">
          {filtered.length === products.data.length
            ? `${products.data.length} produktów`
            : `${filtered.length} z ${products.data.length} produktów`}
        </p>
      )}
    </>
  )
}
