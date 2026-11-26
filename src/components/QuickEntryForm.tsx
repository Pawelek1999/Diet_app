import { useState, type FormEvent } from 'react'
import {
  QUICK_ENTRY_DEFAULT_NAME,
  validateQuickEntry,
  type QuickEntryErrors,
  type QuickEntryValues,
} from '@/lib/quickEntry'
import type { Macros } from '@/types'

type Props = {
  initial: QuickEntryValues
  submitLabel: string
  busy: boolean
  error: string | null
  autoFocus?: boolean
  onCancel?: () => void
  onSubmit: (name: string, macros: Macros) => void
}

const MACRO_FIELDS: { key: 'protein' | 'fat' | 'carbs'; label: string }[] = [
  { key: 'protein', label: 'Białko (g)' },
  { key: 'fat', label: 'Tłuszcz (g)' },
  { key: 'carbs', label: 'Węglowodany (g)' },
]

/** Quick entry without a product: kcal + optional macros + optional name. */
export function QuickEntryForm({ initial, submitLabel, busy, error, autoFocus, onCancel, onSubmit }: Props) {
  const [values, setValues] = useState<QuickEntryValues>(initial)
  const [errors, setErrors] = useState<QuickEntryErrors>({})

  function set(key: keyof QuickEntryValues, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined, ...(key !== 'name' ? { kcal: undefined } : {}) }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const r = validateQuickEntry(values)
    if (!r.ok) {
      setErrors(r.errors)
      return
    }
    onSubmit(r.name, r.macros)
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="grid-2">
        <label className="field">
          <span className="field-label">Kalorie (kcal)</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoFocus={autoFocus}
            value={values.kcal}
            aria-invalid={Boolean(errors.kcal)}
            onChange={(e) => set('kcal', e.target.value)}
          />
          {errors.kcal && <span className="field-error">{errors.kcal}</span>}
        </label>
        {MACRO_FIELDS.map(({ key, label }) => (
          <label key={key} className="field">
            <span className="field-label">{label}</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={values[key]}
              aria-invalid={Boolean(errors[key])}
              onChange={(e) => set(key, e.target.value)}
            />
            {errors[key] && <span className="field-error">{errors[key]}</span>}
          </label>
        ))}
      </div>
      <p className="muted small">Makro opcjonalne. Bez kalorii — policzymy je z makro.</p>
      <label className="field">
        <span className="field-label">Nazwa (opcjonalnie)</span>
        <input type="text" placeholder={QUICK_ENTRY_DEFAULT_NAME} value={values.name} onChange={(e) => set('name', e.target.value)} />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        {onCancel && (
          <button type="button" className="button button-secondary" onClick={onCancel}>
            Anuluj
          </button>
        )}
        <button type="submit" className="button button-primary" disabled={busy}>
          {busy ? 'Zapisywanie…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
