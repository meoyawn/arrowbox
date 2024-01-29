import { isNodeID, type EdgeID, type NodeID } from "../data/data.ts"
import { patching } from "../data/history.ts"
import type { State } from "../data/state.ts"
import { addEdge } from "../data/transactions.ts"
import type { DragBehavior2 } from "../drag.ts"

export function dragNewArrow(
  id: NodeID,
  sx: number,
  sy: number,
): DragBehavior2 {
  return {
    x: sx,
    y: sy,
    onDrag: (_: State, x: number, y: number): Partial<State> => ({
      newArrow: { from: id, toX: x, toY: y },
      dragging: {},
    }),
    onEnd(store: State, x: number, y: number): Partial<State> {
      const above = isNodeID(store.hovering) ? store.hovering : undefined

      let editing: NodeID | EdgeID

      return {
        tree: patching(store.tree, data => {
          editing = addEdge(data, { from: id, to: above, world: [x, y] })
        }),
        newArrow: undefined,
        dragging: undefined,
        editing: editing!,
      }
    },
  }
}
