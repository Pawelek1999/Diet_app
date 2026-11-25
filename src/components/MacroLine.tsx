import { formatMacro } from '@/lib/format'
import type { Macros } from '@/types'

/** Compact "B 12 · T 0 · W 4" line with macro colors. */
export function MacroLine({ macros }: { macros: Macros }) {
  return (
    <span className="macro-line">
      <span className="macro-p">B {formatMacro(macros.protein)}</span>
      <span className="macro-f">T {formatMacro(macros.fat)}</span>
      <span className="macro-c">W {formatMacro(macros.carbs)}</span>
    </span>
  )
}
