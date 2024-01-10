import { type BBox } from "rbush"
import { brushSelect } from "../brushing.ts"
import { type DragBehavior2 } from "../drag"
import { type Store } from "../store"

export const dragBrush = (sx: number, sy: number): DragBehavior2 => ({
  x: sx,
  y: sy,
  onDrag(store: Store, x: number, y: number): Partial<Store> {
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
  onEnd: (): Partial<Store> => ({ brush: undefined }),
})
