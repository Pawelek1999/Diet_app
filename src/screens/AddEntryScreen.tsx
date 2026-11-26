import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AmountPanel } from '@/components/AmountPanel'
import { QueryState } from '@/components/QueryState'
import { QuickEntryForm } from '@/components/QuickEntryForm'
import { ScreenHeader } from '@/components/ScreenHeader'
import { SearchInput } from '@/components/SearchInput'
import { MealSelect } from '@/components/MealSelect'
import { useDishes } from '@/hooks/useDishes'
import { useCreateEntry, useRecentEntries } from '@/hooks/useEntries'
import { useProducts } from '@/hooks/useProducts'
import { isDayKey, todayKey } from '@/lib/dates'
import { EMPTY_QUICK_ENTRY } from '@/lib/quickEntry'
import { summarizeDish } from '@/lib/dishes'
import {
  amountLabel,
  defaultAmount,
  foodItemKey,
  foodItemName,
  recentItems,
  type FoodItem,
} from '@/lib/entries'
import { formatKcal, matchesSearch } from '@/lib/format'
import type { Macros, MealId, Unit } from '@/types'

type Selection = { item: FoodItem; amount: number; unit: Unit }

/** Meal from the URL: any safe id (built-in or custom); falls back to breakfast. */
function isMealId(v: string | null): v is MealId {
  return v !== null && /^[a-z0-9_]{1,40}$/.test(v)
}

export function AddEntryScreen() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const rawDate = params.get('date')
  const date = rawDate && isDayKey(rawDate) ? rawDate : todayKey()
  const rawMeal = params.get('meal')
  const [meal, setMeal] = useState<MealId>(isMealId(rawMeal) ? rawMeal : 'breakfast')

  const products = useProducts()
  const dishes = useDishes()
  const recent = useRecentEntries()
  const create = useCreateEntry()

  const [query, setQuery] = useState('')
  const [selection, setSelection] = useState<Selection | null>(null)
  const [quick, setQuick] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const backTo = date === todayKey() ? '/' : `/?date=${date}`
  const addUrl = `/entry/add?date=${date}&meal=${meal}`

  const allItems = useMemo<FoodItem[]>(
    () => [
      ...(products.data ?? []).map((product) => ({ kind: 'product' as const, product })),
      ...(dishes.data ?? []).map((dish) => ({ kind: 'dish' as const, dish })),
    ],
    [products.data, dishes.data],
  )

  const recentList = useMemo(
    () => recentItems(recent.data ?? [], products.data ?? [], dishes.data ?? [], 12),
    [recent.data, products.data, dishes.data],
  )

  const favorites = useMemo(
    () =>
      allItems
        .filter((i) => (i.kind === 'product' ? i.product.isFavorite : i.dish.isFavorite))
        .sort((a, b) => foodItemName(a).localeCompare(foodItemName(b), 'pl')),
    [allItems],
  )

  const results = useMemo(
    () =>
      query.trim() === ''
        ? []
        : allItems
            .filter((i) =>
              matchesSearch(i.kind === 'dish' ? `${i.dish.name} ${i.dish.description ?? ''}` : i.product.name, query),
            )
            .sort((a, b) => foodItemName(a).localeCompare(foodItemName(b), 'pl'))
            .slice(0, 60),
    [allItems, query],
  )

  function pick(item: FoodItem, last: { amount: number; unit: Unit } | null = null) {
    setSaveError(null)
    setSelection({ item, ...(last ?? defaultAmount(item)) })
  }

  async function save(input: Parameters<typeof create.mutateAsync>[0]) {
    setSaveError(null)
    try {
      await create.mutateAsync(input)
      navigate(backTo, { replace: true })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Nie udało się zapisać.')
    }
  }

  function saveSelection(amount: number, unit: Unit, macros: Macros) {
    if (!selection) return
    const { item } = selection
    void save({
      date,
      meal,
      name: foodItemName(item),
      amount,
      unit,
      macros,
      ...(item.kind === 'product'
        ? { sourceType: 'product' as const, productId: item.product.id }
        : { sourceType: 'dish' as const, dishId: item.dish.id }),
    })
  }

  const loading = products.isLoading || dishes.isLoading
  const loadError = products.error ?? dishes.error

  return (
    <>
      <ScreenHeader title="Dodaj wpis" backTo={backTo} />

      <MealSelect value={meal} onChange={setMeal} />

      {selection ? (
        <section className="card section">
          <div className="selected-head">
            <div>
              <h2 className="section-title">{foodItemName(selection.item)}</h2>
              <p className="muted small">{selection.item.kind === 'dish' ? 'Danie' : 'Produkt'}</p>
            </div>
            <button type="button" className="button button-secondary button-small" onClick={() => setSelection(null)}>
              Zmień
            </button>
          </div>
          <AmountPanel
            key={foodItemKey(selection.item)}
            item={selection.item}
            initialAmount={selection.amount}
            initialUnit={selection.unit}
            submitLabel="Dodaj"
            busy={create.isPending}
            error={saveError}
            onSubmit={saveSelection}
          />
        </section>
      ) : quick ? (
        <section className="card section">
          <h2 className="section-title">Szybki wpis</h2>
          <QuickEntryForm
            initial={EMPTY_QUICK_ENTRY}
            submitLabel="Dodaj"
            autoFocus
            busy={create.isPending}
            error={saveError}
            onCancel={() => setQuick(false)}
            onSubmit={(name, macros) =>
              save({ date, meal, name, amount: 1, unit: 'serving', macros, sourceType: 'quick' })
            }
          />
        </section>
      ) : (
        <>
          <SearchInput value={query} onChange={setQuery} placeholder="Szukaj produktu lub dania" inputRef={searchRef} autoFocus />

          <div className="add-actions">
            <button type="button" className="chip" onClick={() => setQuick(true)}>
              ⚡ Szybki wpis
            </button>
            <Link to={`/product/new?returnTo=${encodeURIComponent(addUrl)}`} className="chip">
              + Produkt
            </Link>
            <Link to={`/dish/new?returnTo=${encodeURIComponent(addUrl)}`} className="chip">
              + Danie
            </Link>
          </div>

          <QueryState isLoading={loading} error={loadError} />

          {query.trim() !== '' ? (
            <ItemSection title={`Wyniki (${results.length})`} items={results.map((item) => ({ item, last: null }))} onPick={pick} empty="Brak wyników — dodaj nowy produkt lub danie." />
          ) : (
            <>
              <ItemSection title="Ostatnio używane" items={recentList.map((r) => ({ item: r.item, last: r.lastAmount }))} onPick={pick} empty="Tu pojawią się ostatnio dodawane pozycje." />
              <ItemSection title="Ulubione" items={favorites.map((item) => ({ item, last: null }))} onPick={pick} empty="Oznacz produkty lub dania gwiazdką, żeby były tutaj." />
            </>
          )}
        </>
      )}
    </>
  )
}

type ItemSectionProps = {
  title: string
  items: { item: FoodItem; last: { amount: number; unit: Unit } | null }[]
  onPick: (item: FoodItem, last: { amount: number; unit: Unit } | null) => void
  empty: string
}

function ItemSection({ title, items, onPick, empty }: ItemSectionProps) {
  return (
    <section className="section">
      <h2 className="list-heading">{title}</h2>
      {items.length === 0 ? (
        <p className="muted small">{empty}</p>
      ) : (
        <ul className="list">
          {items.map(({ item, last }) => {
            const kcalInfo =
              item.kind === 'product'
                ? `${formatKcal(item.product.per100g.kcal)} kcal/100 g`
                : `${formatKcal(summarizeDish(item.dish).perServing.kcal)} kcal/porcja`
            return (
              <li key={foodItemKey(item)} className="list-row">
                <button type="button" className="list-row-link list-row-button" onClick={() => onPick(item, last)}>
                  <span className="list-row-main">
                    <span className="list-row-title">
                      {foodItemName(item)}
                      {item.kind === 'dish' && <span className="type-badge">Danie</span>}
                    </span>
                    <span className="list-row-sub">
                      {kcalInfo}
                      {last &&
                        ` · ostatnio ${amountLabel(last.amount, last.unit, item.kind === 'product' ? item.product.servingName : null)}`}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
