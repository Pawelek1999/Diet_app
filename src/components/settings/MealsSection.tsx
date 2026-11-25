import { useState } from 'react'
import { useSaveMeals } from '@/hooks/useSettings'
import { canHideMeal, moveMeal } from '@/lib/settings'
import type { MealSetting } from '@/types'

export function MealsSection({ meals: initial }: { meals: MealSetting[] }) {
  const save = useSaveMeals()
  const [meals, setMeals] = useState<MealSetting[]>(initial)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(next: MealSetting[]) {
    setMeals(next)
    setDirty(true)
    setError(null)
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
      <p className="muted small">Kolejność i widoczność na ekranie „Dziś”. Ukryty posiłek pojawi się, jeśli ma wpisy.</p>
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
              <span>{m.label}</span>
            </label>
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
