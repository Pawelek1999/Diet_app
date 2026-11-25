import { formatKcal, formatMacro } from '@/lib/format'
import type { Macros } from '@/types'

/** Four tiles: kcal, protein, fat, carbs. */
export function MacroGrid({ macros }: { macros: Macros }) {
  return (
    <div className="macro-grid">
      <div className="macro-tile">
        <span className="macro-tile-value">{formatKcal(macros.kcal)}</span>
        <span className="macro-tile-label">kcal</span>
      </div>
      <div className="macro-tile macro-p">
        <span className="macro-tile-value">{formatMacro(macros.protein)}</span>
        <span className="macro-tile-label">białko</span>
      </div>
      <div className="macro-tile macro-f">
        <span className="macro-tile-value">{formatMacro(macros.fat)}</span>
        <span className="macro-tile-label">tłuszcz</span>
      </div>
      <div className="macro-tile macro-c">
        <span className="macro-tile-value">{formatMacro(macros.carbs)}</span>
        <span className="macro-tile-label">węgle</span>
      </div>
    </div>
  )
}
