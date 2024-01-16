import { midPoint, type Rect } from "../../../lib/geometry.ts"
import { isNodeID, type NodeID } from "../data/data.ts"
import { patching } from "../data/history.ts"
import type { DragBehavior2 } from "../drag.ts"
import type { Store } from "../store.ts"
import { addEdge2 } from "../transactions.ts"

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
      return {
        tree: patching(store.tree, data => {
          addEdge2(data, { from: id, to: above, world: [x, y] })
        }),
        newArrow: undefined,
        dragging: undefined,
      }
    },
  }
}
