import { type State } from "../data/state.ts"
import { type DragBehavior2 } from "../drag.ts"

export const dragEdge = (sx: number, sy: number): DragBehavior2 => ({
  x: sx,
  y: sy,
  onDrag(store: State, x: number, y: number): Partial<State> {
    return {}
  },
  onEnd(store: State, x: number, y: number): Partial<State> {
    return {}
  },
})
