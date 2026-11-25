import { weekDays } from '@/lib/dates'
import { sumMacros } from '@/lib/nutrition'
import type { Entry, Macros } from '@/types'

// Weekly history statistics. Pure functions.

export type DayStat = {
  date: string
  macros: Macros
  entries: number
  isFuture: boolean
}

export type WeekStats = {
  days: DayStat[]
  /** average kcal over logged days (with at least one entry) up to today */
  averageKcal: number | null
  loggedDays: number
  /** days at or under goal among logged days */
  daysOnTarget: number
  /** max value for chart scaling (kcal or goal, whichever is bigger) */
  scaleMax: number
}

export function weekStats(entries: readonly Entry[], anyDayInWeek: string, goalKcal: number, today: string): WeekStats {
  const byDate = new Map<string, Entry[]>()
  for (const e of entries) {
    const list = byDate.get(e.date) ?? []
    list.push(e)
    byDate.set(e.date, list)
  }

  const days: DayStat[] = weekDays(anyDayInWeek).map((date) => {
    const list = byDate.get(date) ?? []
    return { date, macros: sumMacros(list.map((e) => e.macros)), entries: list.length, isFuture: date > today }
  })

  const logged = days.filter((d) => !d.isFuture && d.entries > 0)
  const averageKcal = logged.length > 0 ? logged.reduce((acc, d) => acc + d.macros.kcal, 0) / logged.length : null
  const daysOnTarget = logged.filter((d) => d.macros.kcal <= goalKcal).length
  const scaleMax = Math.max(goalKcal, ...days.map((d) => d.macros.kcal), 1)

  return { days, averageKcal, loggedDays: logged.length, daysOnTarget, scaleMax }
}
