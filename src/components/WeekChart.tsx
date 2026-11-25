import { weekdayShort } from '@/lib/dates'
import { formatKcal } from '@/lib/format'
import type { DayStat } from '@/lib/history'

type Props = {
  days: DayStat[]
  goal: number
  scaleMax: number
  today: string
  onSelect: (date: string) => void
}

const W = 340
const H = 200
const TOP = 22
const BOTTOM = 28
const PAD_X = 6

/** Bar chart of daily kcal with a dashed goal line. Bars are tappable. */
export function WeekChart({ days, goal, scaleMax, today, onSelect }: Props) {
  const plotH = H - TOP - BOTTOM
  const slot = (W - PAD_X * 2) / days.length
  const barW = Math.min(30, slot * 0.6)
  const y = (v: number) => TOP + plotH - (v / scaleMax) * plotH
  const goalY = y(goal)

  return (
    <svg className="week-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Kalorie w tygodniu">
      {/* baseline */}
      <line x1={PAD_X} x2={W - PAD_X} y1={TOP + plotH} y2={TOP + plotH} className="chart-axis" />

      {days.map((d, i) => {
        const cx = PAD_X + slot * i + slot / 2
        const kcal = d.macros.kcal
        const h = Math.max(0, TOP + plotH - y(kcal))
        const over = kcal > d.goalKcal
        const hasOwnGoal = Math.round(d.goalKcal) !== Math.round(goal)
        const isToday = d.date === today
        return (
          <g
            key={d.date}
            className="chart-day"
            onClick={() => onSelect(d.date)}
            role="button"
            tabIndex={0}
            aria-label={`${weekdayShort(d.date)}: ${formatKcal(kcal)} kcal`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelect(d.date)
            }}
          >
            {/* full-height invisible hit area for easy tapping */}
            <rect x={cx - slot / 2} y={0} width={slot} height={H} fill="transparent" />
            {kcal > 0 && (
              <>
                <rect x={cx - barW / 2} y={TOP + plotH - h} width={barW} height={h} rx={5} className={over ? 'chart-bar over' : 'chart-bar'} />
                <text x={cx} y={TOP + plotH - h - 5} textAnchor="middle" className="chart-value">
                  {formatKcal(kcal)}
                </text>
              </>
            )}
            {hasOwnGoal && (
              <line
                x1={cx - barW / 2 - 3}
                x2={cx + barW / 2 + 3}
                y1={y(d.goalKcal)}
                y2={y(d.goalKcal)}
                className="chart-day-goal"
              />
            )}
            <text x={cx} y={H - 9} textAnchor="middle" className={isToday ? 'chart-label today' : 'chart-label'}>
              {weekdayShort(d.date)}
            </text>
          </g>
        )
      })}

      {goal > 0 && (
        <>
          <line x1={PAD_X} x2={W - PAD_X} y1={goalY} y2={goalY} className="chart-goal" />
          <text x={W - PAD_X} y={goalY - 4} textAnchor="end" className="chart-goal-label">
            cel {formatKcal(goal)}
          </text>
        </>
      )}
    </svg>
  )
}
