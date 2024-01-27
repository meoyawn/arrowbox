import { midPoint, type Rect } from "../../../lib/geometry.ts"
import { isNodeID, type EdgeID, type NodeID } from "../data/data.ts"
import { patching } from "../data/history.ts"
import type { Store } from "../data/store.ts"
import { addEdge } from "../data/transactions.ts"
import type { DragBehavior2 } from "../drag.ts"

export function dragNewArrow(id: NodeID, init: Rect): DragBehavior2 {
  const [midX, midY] = midPoint(init)

  return {
    x: midX,
    y: midY,
    onDrag: (store: Store, x: number, y: number): Partial<Store> => ({
      newArrow: { from: id, toX: x, toY: y },
      dragging: {},
    }),
    onEnd(store: Store, x: number, y: number): Partial<Store> {
      const above = isNodeID(store.hovering) ? store.hovering : undefined

      let selected: NodeID | EdgeID

      return {
        tree: patching(store.tree, data => {
          selected = addEdge(data, { from: id, to: above, world: [x, y] })
        }),
        newArrow: undefined,
        dragging: undefined,
        selected: { [selected!]: 1 } as const,
      }
    },
  }
}
