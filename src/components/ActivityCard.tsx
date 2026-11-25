import { useState, type FormEvent } from 'react'
import { useDeleteActivity, useSaveManualActivity } from '@/hooks/useActivity'
import { parseActiveKcal, shortcutRunUrl } from '@/lib/activity'
import { formatAmount, formatKcal } from '@/lib/format'
import type { Activity, ActivitySettings } from '@/types'

type Props = {
  date: string
  activity: Activity | null
  settings: ActivitySettings
  /** kcal added to today's goal (already multiplied by percent); 0 when disabled */
  addedToGoal: number
}

/** "Spalone" card: value from Garmin (shortcut) or manual, refresh via the iOS shortcut, manual edit. */
export function ActivityCard({ date, activity, settings, addedToGoal }: Props) {
  const save = useSaveManualActivity()
  const remove = useDeleteActivity()
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')
  const [error, setError] = useState<string | null>(null)

  function startEdit() {
    setRaw(activity ? formatAmount(activity.activeKcal) : '')
    setError(null)
    setEditing(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = parseActiveKcal(raw)
    if ('error' in parsed) {
      setError(parsed.error)
      return
    }
    try {
      await save.mutateAsync({ date, activeKcal: parsed.value })
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać.')
    }
  }

  async function handleDelete() {
    try {
      await remove.mutateAsync(date)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się usunąć.')
    }
  }

  return (
    <section className="card activity-card" aria-label="Spalone kalorie">
      <div className="activity-row">
        <span className="activity-icon" aria-hidden="true">🔥</span>
        <div className="activity-main">
          {activity ? (
            <>
              <span className="activity-value">Spalone: {formatKcal(activity.activeKcal)} kcal</span>
              <span className="muted small">
                {activity.source === 'shortcut' ? 'z Garmina' : 'wpisane ręcznie'}
                {addedToGoal > 0 && ` · +${formatKcal(addedToGoal)} do celu`}
              </span>
            </>
          ) : (
            <span className="muted">Brak danych o aktywności</span>
          )}
        </div>
        {!editing && (
          <button type="button" className="button button-secondary button-small" onClick={startEdit}>
            {activity ? 'Zmień' : 'Wpisz'}
          </button>
        )}
      </div>

      {!editing && (
        <a className="button button-secondary activity-refresh" href={shortcutRunUrl(settings.shortcutName)}>
          ⟳ Odśwież z Garmina
        </a>
      )}

      {editing && (
        <form className="activity-edit" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field-label">Spalone kalorie aktywne (kcal)</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              value={raw}
              aria-invalid={Boolean(error)}
              onChange={(e) => {
                setRaw(e.target.value)
                setError(null)
              }}
            />
            {error && <span className="field-error">{error}</span>}
          </label>
          <div className="actions">
            <button type="button" className="button button-secondary" onClick={() => setEditing(false)}>
              Anuluj
            </button>
            <button type="submit" className="button button-primary" disabled={save.isPending}>
              Zapisz
            </button>
            {activity && (
              <button type="button" className="button button-danger" onClick={handleDelete} disabled={remove.isPending}>
                Usuń wartość
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  )
}
