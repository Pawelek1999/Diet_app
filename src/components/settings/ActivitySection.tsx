import { useState, type FormEvent } from 'react'
import { useCreateImportToken, useImportTokenCreatedAt, useSaveActivitySettings } from '@/hooks/useActivity'
import {
  activitySettingsToForm,
  importActivityEndpoint,
  validateActivitySettings,
  type ActivitySettingsForm,
} from '@/lib/activity'
import { formatDayMonth, toDayKey } from '@/lib/dates'
import type { ActivitySettings } from '@/types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

/** Value with a copy button; masked values show only the beginning (the full value is copied). */
function CopyRow({ label, value, secret, masked }: { label: string; value: string; secret?: boolean; masked?: boolean }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Skopiuj ręcznie:', value)
    }
  }
  return (
    <div className="copy-row">
      <span className="field-label">{label}</span>
      <code className={secret ? 'copy-value secret' : 'copy-value'}>
        {masked && value.length > 18 ? `${value.slice(0, 18)}••••••` : value}
      </code>
      <button type="button" className="button button-secondary button-small" onClick={copy}>
        {copied ? 'Skopiowano ✓' : 'Kopiuj'}
      </button>
    </div>
  )
}

export function ActivitySection({ settings }: { settings: ActivitySettings }) {
  const save = useSaveActivitySettings()
  const createToken = useCreateImportToken()
  const tokenCreatedAt = useImportTokenCreatedAt()
  const [form, setForm] = useState<ActivitySettingsForm>(() => activitySettingsToForm(settings))
  const [errors, setErrors] = useState<Partial<Record<'percent' | 'shortcutName', string>>>({})
  const [saved, setSaved] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function update(patch: Partial<ActivitySettingsForm>) {
    setForm((f) => ({ ...f, ...patch }))
    setSaved(false)
    setErrors({})
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const r = validateActivitySettings(form)
    if (!r.ok) {
      setErrors(r.errors)
      return
    }
    try {
      await save.mutateAsync(r.settings)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać.')
    }
  }

  async function handleToken() {
    if (
      tokenCreatedAt.data &&
      !window.confirm('Wygenerować nowy token? Obecny przestanie działać — trzeba będzie wkleić nowy do skrótu.')
    ) {
      return
    }
    setError(null)
    try {
      setNewToken(await createToken.mutateAsync())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się wygenerować tokenu.')
    }
  }

  const tokenDate = tokenCreatedAt.data ? toDayKey(new Date(tokenCreatedAt.data)) : null

  return (
    <section className="card section">
      <h2 className="section-title">Garmin (spalone kalorie)</h2>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className="checkbox">
          <input type="checkbox" checked={form.addToGoal} onChange={(e) => update({ addToGoal: e.target.checked })} />
          <span>Doliczaj spalone kalorie do celu</span>
        </label>
        <div className="grid-2">
          <label className="field">
            <span className="field-label">Ile doliczać (%)</span>
            <input
              type="text"
              inputMode="decimal"
              value={form.percent}
              disabled={!form.addToGoal}
              aria-invalid={Boolean(errors.percent)}
              onChange={(e) => update({ percent: e.target.value })}
            />
            {errors.percent && <span className="field-error">{errors.percent}</span>}
          </label>
          <label className="field">
            <span className="field-label">Nazwa skrótu iOS</span>
            <input
              type="text"
              value={form.shortcutName}
              aria-invalid={Boolean(errors.shortcutName)}
              onChange={(e) => update({ shortcutName: e.target.value })}
            />
            {errors.shortcutName && <span className="field-error">{errors.shortcutName}</span>}
          </label>
        </div>
        <p className="muted small">
          Zegarki często zawyżają spalanie — wielu osobom sprawdza się doliczanie 50%.
        </p>
        <button type="submit" className="button button-primary" disabled={save.isPending}>
          {save.isPending ? 'Zapisywanie…' : saved ? 'Zapisano ✓' : 'Zapisz'}
        </button>
      </form>

      <details className="advanced">
        <summary>Zaawansowane: konfiguracja skrótu iOS</summary>
        <div className="advanced-body">
      <p className="muted small">
        Skrót „{form.shortcutName || settings.shortcutName}” wysyła dzisiejszą aktywną energię z Apple Zdrowie do aplikacji.
        Instrukcja budowy skrótu: docs/START.md, część 5.
      </p>
      <CopyRow label="Adres (URL)" value={importActivityEndpoint(SUPABASE_URL)} />
      <CopyRow label="Nagłówek apikey" value={ANON_KEY} masked />

      {newToken ? (
        <div className="token-box">
          <CopyRow label="Token (pole p_token)" value={newToken} secret />
          <p className="form-warning">
            Skopiuj token teraz i wklej do skrótu — ze względów bezpieczeństwa nie da się go wyświetlić ponownie.
          </p>
        </div>
      ) : (
        <>
          <p className="muted small">
            {tokenDate
              ? `Token aktywny od ${formatDayMonth(tokenDate)} ${tokenDate.slice(0, 4)}.`
              : 'Nie masz jeszcze tokenu — wygeneruj go, żeby skrót mógł wysyłać dane.'}
          </p>
          <button type="button" className="button button-secondary full-width" onClick={handleToken} disabled={createToken.isPending}>
            {tokenDate ? 'Wygeneruj nowy token' : 'Wygeneruj token'}
          </button>
        </>
      )}
        </div>
      </details>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
