import type { BBox } from "rbush"
import { brushSelect } from "../brushing.ts"
import type { State } from "../data/state.ts"
import type { DragBehavior2 } from "../drag.ts"

export const dragBrush = (sx: number, sy: number): DragBehavior2 => ({
  x: sx,
  y: sy,
  onDrag(store: State, x: number, y: number): Partial<State> {
    const brush: BBox = {
      minX: Math.min(sx, x),
      minY: Math.min(sy, y),
      maxX: Math.max(sx, x),
      maxY: Math.max(sy, y),
    }
    return {
      brush,
      selected: brushSelect(store.tree.index.bush, brush),
    }
  },
  onEnd: (): Partial<State> => ({ brush: undefined }),
})
