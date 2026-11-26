import { DEFAULT_MEALS } from '@/constants'
import { useMeals } from '@/hooks/useSettings'

type Props = {
  value: string
  onChange: (meal: string) => void
}

/** Meal picker from settings (visible meals + the current one, even if hidden or deleted). */
export function MealSelect({ value, onChange }: Props) {
  const meals = useMeals().data ?? [...DEFAULT_MEALS]
  const options = meals.filter((m) => m.visible || m.id === value)
  const hasValue = options.some((m) => m.id === value)

  return (
    <label className="field meal-picker">
      <span className="field-label">Posiłek</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {!hasValue && <option value={value}>Inne</option>}
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  )
}
