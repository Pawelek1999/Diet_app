import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AmountPanel } from '@/components/AmountPanel'
import { QueryState } from '@/components/QueryState'
import { ScreenHeader } from '@/components/ScreenHeader'
import { SearchInput } from '@/components/SearchInput'
import { MealSelect } from '@/components/MealSelect'
import { useDishes } from '@/hooks/useDishes'
import { useCreateEntry, useRecentEntries } from '@/hooks/useEntries'
import { useProducts } from '@/hooks/useProducts'
import { isDayKey, todayKey } from '@/lib/dates'
import { summarizeDish } from '@/lib/dishes'
import {
  amountLabel,
  defaultAmount,
  foodItemKey,
  foodItemName,
  recentItems,
  type FoodItem,
} from '@/lib/entries'
import { formatKcal, matchesSearch, parseDecimal } from '@/lib/format'
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
        <QuickEntryForm
          busy={create.isPending}
          error={saveError}
          onCancel={() => setQuick(false)}
          onSubmit={(name, kcal) =>
            save({
              date,
              meal,
              name,
              amount: 1,
              unit: 'serving',
              macros: { kcal, protein: 0, fat: 0, carbs: 0 },
              sourceType: 'quick',
            })
          }
        />
      ) : (
        <>
          <SearchInput value={query} onChange={setQuery} placeholder="Szukaj produktu lub dania" inputRef={searchRef} autoFocus />

          <div className="add-actions">
            <button type="button" className="chip" onClick={() => setQuick(true)}>
              ⚡ Szybki wpis kcal
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

type QuickProps = {
  busy: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (name: string, kcal: number) => void
}

function QuickEntryForm({ busy, error, onCancel, onSubmit }: QuickProps) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const n = parseDecimal(kcal)
    if (n === null || n <= 0) {
      setFieldError('Podaj liczbę kalorii większą od 0.')
      return
    }
    if (n > 10000) {
      setFieldError('Maksymalnie 10000 kcal.')
      return
    }
    onSubmit(name.trim() || 'Szybki wpis', n)
  }

  return (
    <form className="card section form" onSubmit={handleSubmit} noValidate>
      <h2 className="section-title">Szybki wpis</h2>
      <label className="field">
        <span className="field-label">Kalorie (kcal)</span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus
          value={kcal}
          aria-invalid={Boolean(fieldError)}
          onChange={(e) => {
            setKcal(e.target.value)
            setFieldError(null)
          }}
        />
        {fieldError && <span className="field-error">{fieldError}</span>}
      </label>
      <label className="field">
        <span className="field-label">Nazwa (opcjonalnie)</span>
        <input type="text" placeholder="Szybki wpis" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button type="button" className="button button-secondary" onClick={onCancel}>
          Anuluj
        </button>
        <button type="submit" className="button button-primary" disabled={busy}>
          {busy ? 'Zapisywanie…' : 'Dodaj'}
        </button>
      </div>
    </form>
  )
}
