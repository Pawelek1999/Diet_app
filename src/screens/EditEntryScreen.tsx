import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AmountPanel } from '@/components/AmountPanel'
import { MacroGrid } from '@/components/MacroGrid'
import { QueryState } from '@/components/QueryState'
import { ScreenHeader } from '@/components/ScreenHeader'
import { MEAL_IDS, MEAL_LABELS } from '@/constants'
import { useDishes } from '@/hooks/useDishes'
import { useDeleteEntry, useEntry, useUpdateEntry } from '@/hooks/useEntries'
import { useProducts } from '@/hooks/useProducts'
import { todayKey } from '@/lib/dates'
import { amountLabel, parseAmount, recomputeEntryMacros, type FoodItem } from '@/lib/entries'
import { formatAmount, formatKcal, parseDecimal } from '@/lib/format'
import type { Entry, EntryInput, Macros, MealId, Unit } from '@/types'

export function EditEntryScreen() {
  const { id: idParam } = useParams()
  const id = idParam && /^\d+$/.test(idParam) ? Number(idParam) : null
  const entry = useEntry(id)
  const products = useProducts()
  const dishes = useDishes()

  if (entry.isLoading || entry.error || products.isLoading || dishes.isLoading) {
    return (
      <>
        <ScreenHeader title="Wpis" backTo="/" />
        <QueryState
          isLoading={entry.isLoading || products.isLoading || dishes.isLoading}
          error={entry.error}
          onRetry={() => entry.refetch()}
        />
      </>
    )
  }
  if (!entry.data) {
    return (
      <>
        <ScreenHeader title="Wpis" backTo="/" />
        <div className="empty">
          <p>Nie znaleziono wpisu.</p>
        </div>
      </>
    )
  }

  const e = entry.data
  // Source among active (non-deleted) items; null → deleted or quick entry.
  let source: FoodItem | null = null
  if (e.sourceType === 'product') {
    const p = products.data?.find((x) => x.id === e.productId)
    if (p) source = { kind: 'product', product: p }
  } else if (e.sourceType === 'dish') {
    const d = dishes.data?.find((x) => x.id === e.dishId)
    if (d) source = { kind: 'dish', dish: d }
  }

  return <EntryEditor key={e.id} entry={e} source={source} />
}

function EntryEditor({ entry, source }: { entry: Entry; source: FoodItem | null }) {
  const navigate = useNavigate()
  const update = useUpdateEntry()
  const remove = useDeleteEntry()
  const [meal, setMeal] = useState<MealId>(entry.meal)
  const [error, setError] = useState<string | null>(null)

  const backTo = entry.date === todayKey() ? '/' : `/?date=${entry.date}`

  async function persist(changes: Partial<Pick<EntryInput, 'amount' | 'unit' | 'macros' | 'name'>>) {
    setError(null)
    const base = {
      date: entry.date,
      meal,
      name: changes.name ?? entry.name,
      amount: changes.amount ?? entry.amount,
      unit: changes.unit ?? entry.unit,
      macros: changes.macros ?? entry.macros,
    }
    const input: EntryInput =
      entry.sourceType === 'product'
        ? { ...base, sourceType: 'product', productId: entry.productId }
        : entry.sourceType === 'dish'
          ? { ...base, sourceType: 'dish', dishId: entry.dishId }
          : { ...base, sourceType: 'quick' }
    try {
      await update.mutateAsync({ id: entry.id, input })
      navigate(backTo, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać.')
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Usunąć wpis „${entry.name}"?`)) return
    try {
      await remove.mutateAsync(entry.id)
      navigate(backTo, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się usunąć.')
    }
  }

  const busy = update.isPending || remove.isPending

  return (
    <>
      <ScreenHeader title="Edytuj wpis" backTo={backTo} />
      <h2 className="detail-title">{entry.name}</h2>

      <label className="field meal-picker">
        <span className="field-label">Posiłek</span>
        <select value={meal} onChange={(e) => setMeal(e.target.value as MealId)}>
          {MEAL_IDS.map((id) => (
            <option key={id} value={id}>
              {MEAL_LABELS[id]}
            </option>
          ))}
        </select>
      </label>

      <section className="card section">
        {entry.sourceType === 'quick' ? (
          <QuickEditor entry={entry} busy={busy} error={error} onSave={(name, kcal) => persist({ name, macros: { kcal, protein: 0, fat: 0, carbs: 0 } })} />
        ) : source ? (
          <AmountPanel
            item={source}
            initialAmount={entry.amount}
            initialUnit={entry.unit}
            submitLabel="Zapisz"
            busy={busy}
            error={error}
            onSubmit={(amount: number, unit: Unit, macros: Macros) =>
              // Unchanged amount (e.g. only the meal changed) keeps the original snapshot:
              // later edits of the product/dish must not leak into past entries.
              amount === entry.amount && unit === entry.unit ? persist({}) : persist({ amount, unit, macros })
            }
          />
        ) : (
          <OrphanEditor entry={entry} busy={busy} error={error} onSave={(amount, macros) => persist({ amount, macros })} />
        )}
      </section>

      <button type="button" className="button button-danger full-width section" onClick={handleDelete} disabled={busy}>
        Usuń wpis
      </button>
    </>
  )
}

/** Entry whose product/dish was deleted: only the amount can change (snapshot is rescaled). */
function OrphanEditor({
  entry,
  busy,
  error,
  onSave,
}: {
  entry: Entry
  busy: boolean
  error: string | null
  onSave: (amount: number, macros: Macros) => void
}) {
  const [raw, setRaw] = useState(formatAmount(entry.amount))
  const [fieldError, setFieldError] = useState<string | null>(null)
  const amount = parseDecimal(raw)
  const preview = useMemo(
    () => recomputeEntryMacros(entry, null, amount !== null && amount > 0 ? amount : 0, entry.unit),
    [entry, amount],
  )

  function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = parseAmount(raw, entry.unit)
    if ('error' in parsed) {
      setFieldError(parsed.error)
      return
    }
    const macros = recomputeEntryMacros(entry, null, parsed.value, entry.unit)
    if (macros) onSave(parsed.value, macros)
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <p className="muted small">
        Produkt lub danie zostało usunięte — wartości przeliczą się proporcjonalnie do zapisanych ({amountLabel(entry.amount, entry.unit)} ={' '}
        {formatKcal(entry.macros.kcal)} kcal).
      </p>
      <label className="field">
        <span className="field-label">{entry.unit === 'g' ? 'Ilość (g)' : 'Liczba porcji'}</span>
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          aria-invalid={Boolean(fieldError)}
          onChange={(e) => {
            setRaw(e.target.value)
            setFieldError(null)
          }}
        />
        {fieldError && <span className="field-error">{fieldError}</span>}
      </label>
      {preview && <MacroGrid macros={preview} />}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="button button-primary" disabled={busy}>
        {busy ? 'Zapisywanie…' : 'Zapisz'}
      </button>
    </form>
  )
}

function QuickEditor({
  entry,
  busy,
  error,
  onSave,
}: {
  entry: Entry
  busy: boolean
  error: string | null
  onSave: (name: string, kcal: number) => void
}) {
  const [name, setName] = useState(entry.name)
  const [kcal, setKcal] = useState(formatAmount(entry.macros.kcal))
  const [fieldError, setFieldError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const n = parseDecimal(kcal)
    if (n === null || n <= 0 || n > 10000) {
      setFieldError('Podaj liczbę kalorii od 1 do 10000.')
      return
    }
    onSave(name.trim() || 'Szybki wpis', n)
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label className="field">
        <span className="field-label">Kalorie (kcal)</span>
        <input
          type="text"
          inputMode="decimal"
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
        <span className="field-label">Nazwa</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="button button-primary" disabled={busy}>
        {busy ? 'Zapisywanie…' : 'Zapisz'}
      </button>
    </form>
  )
}
