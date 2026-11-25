import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'
import { QueryState } from '@/components/QueryState'
import { WeekChart } from '@/components/WeekChart'
import { DEFAULT_GOALS } from '@/constants'
import { listEntriesInRange } from '@/db/repositories/entries'
import { useActivityRange, useActivitySettings } from '@/hooks/useActivity'
import { entryKeys } from '@/hooks/useEntries'
import { useGoals } from '@/hooks/useSettings'
import { addDays, formatDayMonth, isDayKey, startOfWeek, todayKey } from '@/lib/dates'
import { formatKcal, formatMacro } from '@/lib/format'
import { weekStats } from '@/lib/history'
import { dailyKcalGoal } from '@/lib/nutrition'
import { DEFAULT_ACTIVITY_SETTINGS } from '@/constants'

export function HistoryScreen() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const today = todayKey()
  const raw = params.get('week')
  const monday = startOfWeek(raw && isDayKey(raw) ? raw : today)
  const sunday = addDays(monday, 6)
  const isCurrentWeek = monday === startOfWeek(today)

  const goals = useGoals()
  const goal = (goals.data ?? DEFAULT_GOALS).kcal
  const entries = useQuery({
    queryKey: [...entryKeys.all, 'range', monday, sunday],
    queryFn: () => listEntriesInRange(monday, sunday),
  })

  const activity = useActivityRange(monday, sunday)
  const activitySettings = useActivitySettings().data ?? DEFAULT_ACTIVITY_SETTINGS
  const activeByDate = new Map((activity.data ?? []).map((a) => [a.date, a.activeKcal]))

  // Cheap to compute (max ~7 days of entries) — no memoization needed.
  const stats = weekStats(
    entries.data ?? [],
    monday,
    (date) => dailyKcalGoal(goal, activeByDate.get(date), activitySettings),
    today,
  )

  const logged = stats.days.filter((d) => !d.isFuture && d.entries > 0)
  const avgMacros =
    logged.length === 0
      ? null
      : {
          protein: logged.reduce((a, d) => a + d.macros.protein, 0) / logged.length,
          fat: logged.reduce((a, d) => a + d.macros.fat, 0) / logged.length,
          carbs: logged.reduce((a, d) => a + d.macros.carbs, 0) / logged.length,
        }

  function goWeek(delta: number) {
    const next = addDays(monday, delta * 7)
    setParams(next === startOfWeek(today) ? {} : { week: next }, { replace: true })
  }

  return (
    <>
      <h1 className="screen-title">Historia</h1>

      <div className="day-nav">
        <button type="button" className="icon-button" onClick={() => goWeek(-1)} aria-label="Poprzedni tydzień">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="day-nav-label">
          <span className="week-title">
            {formatDayMonth(monday)} – {formatDayMonth(sunday)}
          </span>
          {isCurrentWeek && <span className="day-nav-sub">ten tydzień</span>}
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => goWeek(1)}
          disabled={isCurrentWeek}
          aria-label="Następny tydzień"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <QueryState isLoading={entries.isLoading} error={entries.error} onRetry={() => entries.refetch()} />

      {entries.data && (
        <>
          <section className="card">
            <WeekChart
              days={stats.days}
              goal={goal}
              scaleMax={stats.scaleMax}
              today={today}
              onSelect={(date) => navigate(date === today ? '/' : `/?date=${date}`)}
            />
            <p className="muted small center">Dotknij dnia, żeby zobaczyć szczegóły.</p>
          </section>

          <section className="card section stats-grid">
            <div className="stat">
              <span className="stat-value">{stats.averageKcal === null ? '—' : formatKcal(stats.averageKcal)}</span>
              <span className="stat-label">średnio kcal/dzień</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {stats.daysOnTarget}/{stats.loggedDays}
              </span>
              <span className="stat-label">dni w celu</span>
            </div>
            {avgMacros && (
              <div className="stat stat-wide">
                <span className="macro-line">
                  <span className="macro-p">B {formatMacro(avgMacros.protein)}</span>
                  <span className="macro-f">T {formatMacro(avgMacros.fat)}</span>
                  <span className="macro-c">W {formatMacro(avgMacros.carbs)}</span>
                </span>
                <span className="stat-label">średnie makro (g/dzień)</span>
              </div>
            )}
          </section>

          {stats.loggedDays === 0 && <p className="muted small center">Brak wpisów w tym tygodniu.</p>}
        </>
      )}
    </>
  )
}
