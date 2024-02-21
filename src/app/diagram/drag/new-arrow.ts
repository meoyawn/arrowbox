import { isNodeID, type EdgeID, type NodeID } from "../data/data.ts"
import { type EdgeAnchor } from "../data/edge-anchor.ts"
import { patching } from "../data/history.ts"
import { type State } from "../data/state.ts"
import { addEdge } from "../data/transactions.ts"
import { type DragBehavior2 } from "../drag.ts"
import { ROOT_ID } from "../data/ROOT_ID.ts"

export const dragNewArrow = (
  from: EdgeAnchor,
  sx: number,
  sy: number,
): DragBehavior2 => ({
  x: sx,
  y: sy,
  onDrag: (s: State, x: number, y: number): Partial<State> => ({
    newArrow: {
      from,
      to: isNodeID(s.hovering)
        ? { type: "node", id: s.hovering }
        : { type: "relative", id: ROOT_ID, x, y },
    },
    dragging: {},
  }),
  onEnd(store: State): Partial<State> {
    let editing: NodeID | EdgeID | undefined

    return {
      tree: patching(store.tree, data => {
        editing = addEdge(data, store.newArrow!)
      }),
      editing,
      newArrow: undefined,
      dragging: undefined,
    }
  },
})
