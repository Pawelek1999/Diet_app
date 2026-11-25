import { describe, expect, it } from 'vitest'
import {
  addDays,
  diffDays,
  formatDayLabel,
  formatDayMonth,
  isDayKey,
  startOfWeek,
  toDayKey,
  weekDays,
  weekdayIndex,
  weekdayShort,
} from './dates'

describe('isDayKey', () => {
  it('accepts valid dates', () => {
    expect(isDayKey('2026-11-25')).toBe(true)
    expect(isDayKey('2028-02-29')).toBe(true)
  })
  it('rejects invalid formats and dates', () => {
    expect(isDayKey('2026-2-5')).toBe(false)
    expect(isDayKey('2026-02-30')).toBe(false)
    expect(isDayKey('2027-02-29')).toBe(false)
    expect(isDayKey('')).toBe(false)
  })
})

describe('toDayKey', () => {
  it('uses local calendar date', () => {
    expect(toDayKey(new Date(2026, 10, 25, 23, 59))).toBe('2026-11-25')
    expect(toDayKey(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01')
  })
})

describe('addDays', () => {
  it('moves across months and years', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('is not affected by DST changes', () => {
    // Europe/Warsaw DST: 2026-03-29 and 2026-10-25
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
  })
  it('throws on invalid key', () => {
    expect(() => addDays('nope', 1)).toThrow()
  })
})

describe('weeks', () => {
  it('weekdayIndex: Monday = 0, Sunday = 6', () => {
    expect(weekdayIndex('2026-11-23')).toBe(0) // Monday
    expect(weekdayIndex('2026-11-25')).toBe(2) // Wednesday
    expect(weekdayIndex('2026-11-29')).toBe(6) // Sunday
  })
  it('startOfWeek returns Monday', () => {
    expect(startOfWeek('2026-11-25')).toBe('2026-11-23')
    expect(startOfWeek('2026-11-29')).toBe('2026-11-23')
    expect(startOfWeek('2026-11-23')).toBe('2026-11-23')
  })
  it('weekDays returns Mon–Sun', () => {
    expect(weekDays('2026-12-02')).toEqual([
      '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06',
    ])
  })
  it('weekdayShort is Polish', () => {
    expect(weekdayShort('2026-11-25')).toBe('śr')
  })
})

describe('diffDays', () => {
  it('counts signed days', () => {
    expect(diffDays('2026-11-25', '2026-11-26')).toBe(1)
    expect(diffDays('2026-11-25', '2026-11-20')).toBe(-5)
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2)
  })
})

describe('labels', () => {
  it('formatDayMonth uses genitive month', () => {
    expect(formatDayMonth('2026-11-25')).toBe('25 listopada')
    expect(formatDayMonth('2026-03-01')).toBe('1 marca')
  })
  it('formatDayLabel relative to today', () => {
    const today = '2026-11-25'
    expect(formatDayLabel('2026-11-25', today)).toBe('Dziś')
    expect(formatDayLabel('2026-11-24', today)).toBe('Wczoraj')
    expect(formatDayLabel('2026-11-26', today)).toBe('Jutro')
    expect(formatDayLabel('2026-11-20', today)).toBe('piątek, 20 listopada')
  })
})
