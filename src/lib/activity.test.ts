import { describe, expect, it } from 'vitest'
import { DEFAULT_ACTIVITY_SETTINGS } from '@/constants'
import {
  activitySettingsToForm,
  importActivityEndpoint,
  parseActiveKcal,
  parseActivitySettings,
  shortcutRunUrl,
  validateActivitySettings,
} from './activity'

describe('urls', () => {
  it('encodes the shortcut name', () => {
    expect(shortcutRunUrl(' Kalorie Garmin ')).toBe('shortcuts://run-shortcut?name=Kalorie%20Garmin')
    expect(shortcutRunUrl('Żółw & co')).toBe('shortcuts://run-shortcut?name=%C5%BB%C3%B3%C5%82w%20%26%20co')
  })
  it('builds the RPC endpoint', () => {
    expect(importActivityEndpoint('https://abc.supabase.co/')).toBe('https://abc.supabase.co/rest/v1/rpc/import_activity')
  })
})

describe('parseActivitySettings', () => {
  it('returns defaults for missing value', () => {
    expect(parseActivitySettings(null)).toEqual(DEFAULT_ACTIVITY_SETTINGS)
  })
  it('keeps valid fields, replaces invalid ones', () => {
    expect(parseActivitySettings({ addToGoal: true, percent: 150, shortcutName: '  ' })).toEqual({
      addToGoal: true,
      percent: 100,
      shortcutName: 'Kalorie Garmin',
    })
    expect(parseActivitySettings({ addToGoal: 'yes', percent: 50, shortcutName: 'Mój skrót' })).toEqual({
      addToGoal: false,
      percent: 50,
      shortcutName: 'Mój skrót',
    })
  })
})

describe('validateActivitySettings', () => {
  it('round-trips', () => {
    const s = { addToGoal: true, percent: 50, shortcutName: 'Kalorie Garmin' }
    expect(validateActivitySettings(activitySettingsToForm(s))).toEqual({ ok: true, settings: s })
  })
  it('accepts decimal comma and validates range and name', () => {
    expect(validateActivitySettings({ addToGoal: false, percent: '75,5', shortcutName: 'X' })).toEqual({
      ok: true,
      settings: { addToGoal: false, percent: 75.5, shortcutName: 'X' },
    })
    expect(validateActivitySettings({ addToGoal: false, percent: '120', shortcutName: '' })).toEqual({
      ok: false,
      errors: { percent: 'Podaj wartość od 0 do 100.', shortcutName: 'Podaj nazwę skrótu.' },
    })
  })
})

describe('parseActiveKcal', () => {
  it('accepts 0 and decimals', () => {
    expect(parseActiveKcal('0')).toEqual({ value: 0 })
    expect(parseActiveKcal('523,4')).toEqual({ value: 523.4 })
  })
  it('rejects invalid values', () => {
    expect(parseActiveKcal('')).toEqual({ error: 'Podaj wartość.' })
    expect(parseActiveKcal('-1')).toEqual({ error: 'Wartość nie może być ujemna.' })
    expect(parseActiveKcal('99999')).toEqual({ error: 'Maksymalnie 20000.' })
  })
})
