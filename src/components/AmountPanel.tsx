import { useMemo, useState } from 'react'
import { MacroGrid } from '@/components/MacroGrid'
import { foodItemMacros, foodItemUnits, parseAmount, portionWord, type FoodItem } from '@/lib/entries'
import { formatAmount, parseDecimal } from '@/lib/format'
import type { Macros, Unit } from '@/types'

type Props = {
  item: FoodItem
  initialAmount: number
  initialUnit: Unit
  submitLabel: string
  busy?: boolean
  error?: string | null
  onSubmit: (amount: number, unit: Unit, macros: Macros) => void
}

const QUICK: Record<Unit, number[]> = {
  g: [50, 100, 150, 200, 250],
  serving: [0.5, 1, 1.5, 2],
}

/** Amount + unit chooser with live nutrition preview. */
export function AmountPanel({ item, initialAmount, initialUnit, submitLabel, busy, error, onSubmit }: Props) {
  const units = foodItemUnits(item)
  const [unit, setUnit] = useState<Unit>(units.includes(initialUnit) ? initialUnit : (units[0] ?? 'g'))
  const [raw, setRaw] = useState(formatAmount(initialAmount))
  const [fieldError, setFieldError] = useState<string | null>(null)

  const amount = parseDecimal(raw)
  const preview = useMemo(
    () => foodItemMacros(item, amount !== null && amount > 0 ? amount : 0, unit),
    [item, amount, unit],
  )

  const servingName = item.kind === 'product' ? item.product.servingName : null
  const servingGrams = item.kind === 'product' ? item.product.servingGrams : null

  function switchUnit(next: Unit) {
    if (next === unit) return
    setUnit(next)
    setRaw(next === 'g' ? '100' : '1')
    setFieldError(null)
  }

  function submit() {
    const parsed = parseAmount(raw, unit)
    if ('error' in parsed) {
      setFieldError(parsed.error)
      return
    }
    onSubmit(parsed.value, unit, foodItemMacros(item, parsed.value, unit))
  }

  return (
    <div className="amount-panel">
      {units.length > 1 && (
        <div className="segmented" role="tablist" aria-label="Jednostka">
          {units.map((u) => (
            <button
              key={u}
              type="button"
              role="tab"
              aria-selected={unit === u}
              className={unit === u ? 'segmented-item active' : 'segmented-item'}
              onClick={() => switchUnit(u)}
            >
              {u === 'g' ? 'Gramy' : servingName ? `Porcje (${servingName})` : 'Porcje'}
            </button>
          ))}
        </div>
      )}

      <label className="field">
        <span className="field-label">
          {unit === 'g' ? 'Ilość (g)' : 'Liczba porcji'}
          {unit === 'serving' && servingGrams !== null && ` · 1 porcja = ${formatAmount(servingGrams)} g`}
        </span>
        <div className="amount-input-row">
          <input
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            className="amount-input"
            value={raw}
            aria-invalid={Boolean(fieldError)}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              setRaw(e.target.value)
              setFieldError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
          />
          <span className="amount-unit">
            {unit === 'g' ? 'g' : portionWord(amount ?? 0)}
          </span>
        </div>
        {fieldError && <span className="field-error">{fieldError}</span>}
      </label>

      <div className="quick-amounts">
        {QUICK[unit].map((q) => (
          <button
            key={q}
            type="button"
            className={amount === q ? 'chip active' : 'chip'}
            onClick={() => {
              setRaw(formatAmount(q))
              setFieldError(null)
            }}
          >
            {formatAmount(q)}
            {unit === 'g' ? ' g' : ''}
          </button>
        ))}
      </div>

      <MacroGrid macros={preview} />

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button type="button" className="button button-primary" onClick={submit} disabled={busy}>
        {busy ? 'Zapisywanie…' : submitLabel}
      </button>
    </div>
  )
}
