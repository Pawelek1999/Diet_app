import { addDays, formatDayLabel, formatDayMonth, isDayKey, todayKey } from '@/lib/dates'

type Props = {
  date: string
  onChange: (date: string) => void
}

/** ← date → with a native date picker on the label (iOS shows its wheel picker). */
export function DayNav({ date, onChange }: Props) {
  const label = formatDayLabel(date)
  const isToday = date === todayKey()

  return (
    <div className="day-nav">
      <button type="button" className="icon-button" onClick={() => onChange(addDays(date, -1))} aria-label="Poprzedni dzień">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <label className="day-nav-label">
        <span className="day-nav-title">{label}</span>
        {(label === 'Dziś' || label === 'Wczoraj' || label === 'Jutro') && (
          <span className="day-nav-sub">{formatDayMonth(date)}</span>
        )}
        <input
          type="date"
          className="day-nav-input"
          value={date}
          aria-label="Wybierz dzień"
          onChange={(e) => {
            if (isDayKey(e.target.value)) onChange(e.target.value)
          }}
        />
      </label>

      <button type="button" className="icon-button" onClick={() => onChange(addDays(date, 1))} aria-label="Następny dzień">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {!isToday && (
        <button type="button" className="chip day-nav-today" onClick={() => onChange(todayKey())}>
          Dziś
        </button>
      )}
    </div>
  )
}
