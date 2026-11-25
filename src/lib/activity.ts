import { DEFAULT_ACTIVITY_SETTINGS } from '@/constants'
import { formatAmount, parseDecimal } from '@/lib/format'
import type { ActivitySettings } from '@/types'

// Garmin / activity helpers. Pure functions.

/** URL that starts an iOS shortcut by name. */
export function shortcutRunUrl(name: string): string {
  return `shortcuts://run-shortcut?name=${encodeURIComponent(name.trim())}`
}

/** Endpoint the iOS shortcut calls (Supabase RPC). */
export function importActivityEndpoint(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/import_activity`
}

/** Validates stored activity settings; falls back to defaults field by field. */
export function parseActivitySettings(value: unknown): ActivitySettings {
  const v = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const percent = typeof v.percent === 'number' && Number.isFinite(v.percent) && v.percent >= 0 && v.percent <= 100
    ? v.percent
    : DEFAULT_ACTIVITY_SETTINGS.percent
  const shortcutName = typeof v.shortcutName === 'string' && v.shortcutName.trim() !== ''
    ? v.shortcutName.trim()
    : DEFAULT_ACTIVITY_SETTINGS.shortcutName
  return {
    addToGoal: typeof v.addToGoal === 'boolean' ? v.addToGoal : DEFAULT_ACTIVITY_SETTINGS.addToGoal,
    percent,
    shortcutName,
  }
}

export type ActivitySettingsForm = { addToGoal: boolean; percent: string; shortcutName: string }

export function activitySettingsToForm(s: ActivitySettings): ActivitySettingsForm {
  return { addToGoal: s.addToGoal, percent: formatAmount(s.percent), shortcutName: s.shortcutName }
}

export function validateActivitySettings(
  f: ActivitySettingsForm,
): { ok: true; settings: ActivitySettings } | { ok: false; errors: Partial<Record<'percent' | 'shortcutName', string>> } {
  const errors: Partial<Record<'percent' | 'shortcutName', string>> = {}
  const percent = parseDecimal(f.percent)
  if (percent === null) errors.percent = f.percent.trim() === '' ? 'Podaj wartość.' : 'Niepoprawna liczba.'
  else if (percent < 0 || percent > 100) errors.percent = 'Podaj wartość od 0 do 100.'
  const shortcutName = f.shortcutName.trim()
  if (shortcutName === '') errors.shortcutName = 'Podaj nazwę skrótu.'
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, settings: { addToGoal: f.addToGoal, percent: percent as number, shortcutName } }
}

/** Validates manually entered burned kcal. */
export function parseActiveKcal(raw: string): { value: number } | { error: string } {
  const n = parseDecimal(raw)
  if (n === null) return { error: raw.trim() === '' ? 'Podaj wartość.' : 'Niepoprawna liczba.' }
  if (n < 0) return { error: 'Wartość nie może być ujemna.' }
  if (n > 20000) return { error: 'Maksymalnie 20000.' }
  return { value: n }
}
