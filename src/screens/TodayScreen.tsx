import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { DayNav } from '@/components/DayNav'
import { DayProgress } from '@/components/DayProgress'
import { QueryState } from '@/components/QueryState'
import { DEFAULT_GOALS, DEFAULT_MEALS } from '@/constants'
import { useDayEntries } from '@/hooks/useEntries'
import { useProducts } from '@/hooks/useProducts'
import { useGoals, useMeals } from '@/hooks/useSettings'
import { isDayKey, todayKey } from '@/lib/dates'
import { amountLabel, groupEntriesByMeal } from '@/lib/entries'
import { formatKcal } from '@/lib/format'
import { sumMacros } from '@/lib/nutrition'

export function TodayScreen() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('date')
  const date = raw && isDayKey(raw) ? raw : todayKey()

  const entries = useDayEntries(date)
  const goals = useGoals()
  const meals = useMeals()
  const products = useProducts()
  const servingNames = useMemo(
    () => new Map((products.data ?? []).map((p) => [p.id, p.servingName])),
    [products.data],
  )

  const groups = useMemo(
    () => groupEntriesByMeal(entries.data ?? [], meals.data ?? DEFAULT_MEALS),
    [entries.data, meals.data],
  )
  const eaten = useMemo(() => sumMacros((entries.data ?? []).map((e) => e.macros)), [entries.data])

  function changeDate(next: string) {
    setParams(next === todayKey() ? {} : { date: next }, { replace: true })
  }

  return (
    <>
      <DayNav date={date} onChange={changeDate} />
      <DayProgress eaten={eaten} goals={goals.data ?? DEFAULT_GOALS} />

      <QueryState isLoading={entries.isLoading} error={entries.error} onRetry={() => entries.refetch()} />

      {entries.data &&
        groups.map(({ meal, entries: mealEntries, total }) => (
          <section key={meal.id} className="meal" aria-label={meal.label}>
            <header className="meal-header">
              <h2 className="meal-title">{meal.label}</h2>
              {mealEntries.length > 0 && <span className="meal-total">{formatKcal(total.kcal)} kcal</span>}
              <Link
                to={`/entry/add?date=${date}&meal=${meal.id}`}
                className="icon-button meal-add"
                aria-label={`Dodaj do: ${meal.label}`}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </Link>
            </header>
            {mealEntries.length > 0 && (
              <ul className="list">
                {mealEntries.map((e) => (
                  <li key={e.id} className="list-row">
                    <Link to={`/entry/${e.id}`} className="list-row-link">
                      <span className="list-row-main">
                        <span className="list-row-title">{e.name}</span>
                        <span className="list-row-sub">
                          {e.sourceType === 'quick'
                            ? 'Szybki wpis'
                            : amountLabel(
                                e.amount,
                                e.unit,
                                e.sourceType === 'product' ? servingNames.get(e.productId) : null,
                              )}
                        </span>
                      </span>
                      <span className="list-row-value entry-kcal">{formatKcal(e.macros.kcal)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

      {entries.data && entries.data.length === 0 && (
        <p className="muted small center">Brak wpisów — dotknij „+” przy posiłku, żeby dodać.</p>
      )}
    </>
  )
}
