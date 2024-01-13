import { midPoint, type Rect } from "../../../lib/geometry.ts"
import { type NodeID } from "../data/data.ts"
import { patching } from "../data/history.ts"
import type { DragBehavior2 } from "../drag.ts"
import type { Store } from "../store.ts"

export function dragNewArrow(id: NodeID, init: Rect): DragBehavior2 {
  const [midX, midY] = midPoint(init)
  return {
    x: midX,
    y: midY,
    onDrag: (store: Store, x: number, y: number): Partial<Store> => ({
      newArrow: { from: id, to: [x, y] },
    }),
    onEnd(store: Store, x: number, y: number): Partial<Store> {
      return {
        newArrow: undefined,
        tree: patching(store.tree, ({ edges, nodes }) => {
          throw new Error("TODO")
        }),
      }
    },
  }
}
