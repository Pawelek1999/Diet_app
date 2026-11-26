import { useState, type FormEvent } from 'react'
import { MAX_MEALS } from '@/constants'
import { countEntriesForMeal } from '@/db/repositories/entries'
import { useSaveMeals } from '@/hooks/useSettings'
import {
  addCustomMeal,
  canAddMeal,
  canHideMeal,
  moveMeal,
  newCustomMealId,
  removeCustomMeal,
  renameMeal,
  validateMealLabel,
} from '@/lib/settings'
import type { MealSetting } from '@/types'

export function MealsSection({ meals: initial }: { meals: MealSetting[] }) {
  const save = useSaveMeals()
  const [meals, setMeals] = useState<MealSetting[]>(initial)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  function update(next: MealSetting[]) {
    setMeals(next)
    setDirty(true)
    setError(null)
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!canAddMeal(meals)) {
      setAddError(`Maksymalnie ${MAX_MEALS} posiłków.`)
      return
    }
    const r = validateMealLabel(meals, newLabel)
    if (!r.ok) {
      setAddError(r.error)
      return
    }
    update(addCustomMeal(meals, r.label, newCustomMealId()))
    setNewLabel('')
    setAddError(null)
  }

  function handleRename(m: MealSetting) {
    const input = window.prompt('Nowa nazwa posiłku:', m.label)
    if (input === null) return
    const r = validateMealLabel(meals, input, m.id)
    if (!r.ok) {
      window.alert(r.error)
      return
    }
    update(renameMeal(meals, m.id, r.label))
  }

  async function handleRemove(m: MealSetting) {
    try {
      const count = await countEntriesForMeal(m.id)
      if (count > 0) {
        window.alert(
          `Posiłek „${m.label}” ma ${count} wpisów w dzienniku, więc nie można go usunąć. Możesz go ukryć (odznacz pole).`,
        )
        return
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się sprawdzić wpisów.')
      return
    }
    if (!window.confirm(`Usunąć posiłek „${m.label}”?`)) return
    update(removeCustomMeal(meals, m.id))
  }

  async function handleSave() {
    try {
      await save.mutateAsync(meals)
      setDirty(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać.')
    }
  }

  return (
    <section className="card section">
      <h2 className="section-title">Posiłki</h2>
      <p className="muted small">
        Kolejność, nazwy i widoczność na ekranie „Dziś”. Ukryty posiłek pojawi się, jeśli ma wpisy.
      </p>
      <ul className="plain-list">
        {meals.map((m, index) => (
          <li key={m.id} className="meal-setting-row">
            <label className="checkbox meal-setting-label">
              <input
                type="checkbox"
                checked={m.visible}
                disabled={m.visible && !canHideMeal(meals, m.id)}
                onChange={(e) => update(meals.map((x) => (x.id === m.id ? { ...x, visible: e.target.checked } : x)))}
              />
              <span className="meal-setting-name">{m.label}</span>
            </label>
            <button type="button" className="icon-button" onClick={() => handleRename(m)} aria-label={`Zmień nazwę: ${m.label}`}>
              ✎
            </button>
            {m.custom ? (
              <button type="button" className="icon-button danger" onClick={() => void handleRemove(m)} aria-label={`Usuń: ${m.label}`}>
                ×
              </button>
            ) : (
              <span className="icon-button-placeholder" aria-hidden="true" />
            )}
            <button
              type="button"
              className="icon-button"
              disabled={index === 0}
              onClick={() => update(moveMeal(meals, index, -1))}
              aria-label={`Przesuń w górę: ${m.label}`}
            >
              ↑
            </button>
            <button
              type="button"
              className="icon-button"
              disabled={index === meals.length - 1}
              onClick={() => update(moveMeal(meals, index, 1))}
              aria-label={`Przesuń w dół: ${m.label}`}
            >
              ↓
            </button>
          </li>
        ))}
      </ul>

      {canAddMeal(meals) && (
        <form className="add-meal" onSubmit={handleAdd} noValidate>
          <label className="field">
            <span className="field-label">Nowy posiłek</span>
            <input
              type="text"
              placeholder="np. Przed treningiem"
              value={newLabel}
              aria-invalid={Boolean(addError)}
              onChange={(e) => {
                setNewLabel(e.target.value)
                setAddError(null)
              }}
            />
          </label>
          <button type="submit" className="button button-secondary">
            + Dodaj
          </button>
          {addError && <span className="field-error add-meal-error">{addError}</span>}
        </form>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {dirty && (
        <button type="button" className="button button-primary full-width" onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? 'Zapisywanie…' : 'Zapisz posiłki'}
        </button>
      )}
    </section>
  )
}
