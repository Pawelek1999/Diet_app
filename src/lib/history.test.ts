import { describe, expect, it } from 'vitest'
import type { Entry } from '@/types'
import { weekStats } from './history'

function entry(id: number, date: string, kcal: number): Entry {
  return {
    id,
    date,
    meal: 'lunch',
    name: 'X',
    amount: 1,
    unit: 'serving',
    macros: { kcal, protein: 10, fat: 5, carbs: 20 },
    createdAt: '',
    sourceType: 'quick',
  }
}

describe('weekStats', () => {
  // Week Mon 2026-11-23 … Sun 2026-11-29, today = Wed 2026-11-25
  const entries = [
    entry(1, '2026-11-23', 1500),
    entry(2, '2026-11-23', 500),
    entry(3, '2026-11-24', 2500),
    entry(4, '2026-11-25', 1200),
  ]
  const s = weekStats(entries, '2026-11-25', 2200, '2026-11-25')

  it('builds 7 days Mon–Sun with sums', () => {
    expect(s.days.map((d) => d.date)).toEqual([
      '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29',
    ])
    expect(s.days[0]?.macros.kcal).toBe(2000)
    expect(s.days[0]?.macros.protein).toBe(20)
    expect(s.days[0]?.entries).toBe(2)
  })

  it('marks future days', () => {
    expect(s.days.map((d) => d.isFuture)).toEqual([false, false, false, true, true, true, true])
  })

  it('averages only logged days up to today', () => {
    expect(s.loggedDays).toBe(3)
    expect(s.averageKcal).toBeCloseTo((2000 + 2500 + 1200) / 3, 6)
    expect(s.daysOnTarget).toBe(2)
  })

  it('scales to the max of goal and days', () => {
    expect(s.scaleMax).toBe(2500)
    expect(weekStats([], '2026-11-25', 2200, '2026-11-25').scaleMax).toBe(2200)
  })

  it('returns null average for an empty week', () => {
    const empty = weekStats([], '2026-11-25', 2200, '2026-11-25')
    expect(empty.averageKcal).toBeNull()
    expect(empty.loggedDays).toBe(0)
  })
})
