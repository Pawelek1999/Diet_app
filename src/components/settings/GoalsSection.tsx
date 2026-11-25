import { useState, type FormEvent } from 'react'
import { useSaveGoals } from '@/hooks/useSettings'
import { formatKcal, parseDecimal } from '@/lib/format'
import { goalsToFormValues, kcalFromGoals, validateGoalsForm, type GoalsFormErrors, type GoalsFormValues } from '@/lib/settings'
import type { Goals } from '@/types'

const FIELDS: { key: keyof Goals; label: string }[] = [
  { key: 'kcal', label: 'Kalorie (kcal)' },
  { key: 'protein', label: 'Białko (g)' },
  { key: 'fat', label: 'Tłuszcz (g)' },
  { key: 'carbs', label: 'Węglowodany (g)' },
]

export function GoalsSection({ goals }: { goals: Goals }) {
  const save = useSaveGoals()
  const [values, setValues] = useState<GoalsFormValues>(() => goalsToFormValues(goals))
  const [errors, setErrors] = useState<GoalsFormErrors>({})
  const [saved, setSaved] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const macroKcal = kcalFromGoals({
    protein: parseDecimal(values.protein) ?? 0,
    fat: parseDecimal(values.fat) ?? 0,
    carbs: parseDecimal(values.carbs) ?? 0,
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    const r = validateGoalsForm(values)
    if (!r.ok) {
      setErrors(r.errors)
      return
    }
    try {
      await save.mutateAsync(r.goals)
      setSaved(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Nie udało się zapisać.')
    }
  }

  return (
    <form className="card section form" onSubmit={handleSubmit} noValidate>
      <h2 className="section-title">Cele dzienne</h2>
      <div className="grid-2">
        {FIELDS.map(({ key, label }) => (
          <label key={key} className="field">
            <span className="field-label">{label}</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={values[key]}
              aria-invalid={Boolean(errors[key])}
              onChange={(e) => {
                setValues((v) => ({ ...v, [key]: e.target.value }))
                setErrors((er) => ({ ...er, [key]: undefined }))
                setSaved(false)
              }}
            />
            {errors[key] && <span className="field-error">{errors[key]}</span>}
          </label>
        ))}
      </div>
      {macroKcal > 0 && (
        <p className="muted small">Makro daje ok. {formatKcal(macroKcal)} kcal (4·B + 9·T + 4·W).</p>
      )}
      {submitError && (
        <p className="form-error" role="alert">
          {submitError}
        </p>
      )}
      <button type="submit" className="button button-primary" disabled={save.isPending}>
        {save.isPending ? 'Zapisywanie…' : saved ? 'Zapisano ✓' : 'Zapisz cele'}
      </button>
    </form>
  )
}
