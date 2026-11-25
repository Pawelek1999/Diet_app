import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { FavoriteButton } from '@/components/FavoriteButton'
import { MacroLine } from '@/components/MacroLine'
import { QueryState } from '@/components/QueryState'
import { SearchInput } from '@/components/SearchInput'
import { useDishes, useToggleDishFavorite } from '@/hooks/useDishes'
import { summarizeDish } from '@/lib/dishes'
import { formatKcal, matchesSearch } from '@/lib/format'

export function DishList() {
  const dishes = useDishes()
  const toggleFavorite = useToggleDishFavorite()
  const [query, setQuery] = useState('')
  const [onlyFavorites, setOnlyFavorites] = useState(false)

  const rows = useMemo(
    () =>
      (dishes.data ?? [])
        .filter((d) => (!onlyFavorites || d.isFavorite) && matchesSearch(`${d.name} ${d.description ?? ''}`, query))
        .map((d) => ({ dish: d, perServing: summarizeDish(d).perServing })),
    [dishes.data, query, onlyFavorites],
  )

  return (
    <>
      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Szukaj dania" />
        <button
          type="button"
          className={onlyFavorites ? 'chip active' : 'chip'}
          aria-pressed={onlyFavorites}
          onClick={() => setOnlyFavorites((v) => !v)}
        >
          ★ Ulubione
        </button>
      </div>

      <QueryState isLoading={dishes.isLoading} error={dishes.error} onRetry={() => dishes.refetch()} />

      {dishes.data && rows.length === 0 && (
        <div className="empty">
          <p>{query || onlyFavorites ? 'Brak wyników.' : 'Nie masz jeszcze dań.'}</p>
          <Link to="/dish/new" className="button button-secondary">
            Dodaj danie
          </Link>
        </div>
      )}

      {rows.length > 0 && (
        <ul className="list" aria-label="Dania">
          {rows.map(({ dish, perServing }) => (
            <li key={dish.id} className="list-row">
              <Link to={`/dish/${dish.id}`} className="list-row-link">
                <span className="list-row-main">
                  <span className="list-row-title">{dish.name}</span>
                  <span className="list-row-sub">
                    <MacroLine macros={perServing} />
                  </span>
                </span>
                <span className="list-row-value">
                  {formatKcal(perServing.kcal)}
                  <span className="list-row-hint">kcal/porcja</span>
                </span>
              </Link>
              {dish.recipeUrl ? (
                <a
                  className="icon-button recipe-link"
                  href={dish.recipeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Przepis na YouTube: ${dish.name}`}
                >
                  <svg viewBox="0 0 28 20" width="28" height="20" aria-hidden="true">
                    <rect width="28" height="20" rx="5" fill="currentColor" />
                    <path d="M11 5.5v9l8-4.5z" fill="#fff" />
                  </svg>
                </a>
              ) : (
                <span className="icon-button-placeholder" aria-hidden="true" />
              )}
              <FavoriteButton
                active={dish.isFavorite}
                label={dish.name}
                onToggle={() => toggleFavorite.mutate({ id: dish.id, isFavorite: !dish.isFavorite })}
              />
            </li>
          ))}
        </ul>
      )}

      {dishes.data && dishes.data.length > 0 && (
        <p className="muted small list-footer">
          {rows.length === dishes.data.length ? `${dishes.data.length} dań` : `${rows.length} z ${dishes.data.length} dań`}
        </p>
      )}
    </>
  )
}
