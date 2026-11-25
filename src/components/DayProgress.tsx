import { progress } from '@/lib/entries'
import { formatKcal, formatMacro } from '@/lib/format'
import type { Goals, Macros } from '@/types'

/** Calorie progress bar + macro bars vs goals. */
export function DayProgress({ eaten, goals }: { eaten: Macros; goals: Goals }) {
  const remaining = goals.kcal - eaten.kcal
  const over = remaining < 0

  return (
    <section className="card day-progress" aria-label="Podsumowanie dnia">
      <div className="kcal-row">
        <div>
          <span className="kcal-eaten">{formatKcal(eaten.kcal)}</span>
          <span className="muted"> / {formatKcal(goals.kcal)} kcal</span>
        </div>
        <div className={over ? 'kcal-remaining over' : 'kcal-remaining'}>
          {over ? `+${formatKcal(-remaining)} ponad cel` : `zostało ${formatKcal(remaining)}`}
        </div>
      </div>
      <div
        className={over ? 'bar bar-kcal over' : 'bar bar-kcal'}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={Math.round(goals.kcal)}
        aria-valuenow={Math.round(eaten.kcal)}
        aria-label="Kalorie"
      >
        <span style={{ width: `${progress(eaten.kcal, goals.kcal) * 100}%` }} />
      </div>

      <div className="macro-bars">
        <MacroBar label="Białko" className="macro-p" value={eaten.protein} goal={goals.protein} />
        <MacroBar label="Tłuszcz" className="macro-f" value={eaten.fat} goal={goals.fat} />
        <MacroBar label="Węgle" className="macro-c" value={eaten.carbs} goal={goals.carbs} />
      </div>
    </section>
  )
}

function MacroBar({ label, className, value, goal }: { label: string; className: string; value: number; goal: number }) {
  return (
    <div className={`macro-bar ${className}`}>
      <div className="macro-bar-head">
        <span>{label}</span>
        <span className="macro-bar-value">
          {formatMacro(value)}
          {goal > 0 && <span className="muted"> / {formatMacro(goal)} g</span>}
        </span>
      </div>
      <div className="bar bar-macro" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={Math.round(goal)}>
        <span style={{ width: `${progress(value, goal) * 100}%` }} />
      </div>
    </div>
  )
}
