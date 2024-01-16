import { type Rect } from "../../../lib/geometry.ts"
import { rset } from "../../../lib/ts.ts"
import {
  isNodeID,
  rootID,
  type EdgeID,
  type NodeID,
  type NodesEdges,
} from "../data/data.ts"
import { nonPatching, patching } from "../data/history.ts"
import { type DragBehavior2 } from "../drag.ts"
import { type Store } from "../store.ts"

/** world coordinates */
export const dragNode = (
  sx: number,
  sy: number,
  beforeDrag: Readonly<NodesEdges>,
  selected: ReadonlyArray<NodeID | EdgeID>,
): DragBehavior2 => ({
  x: sx,
  y: sy,

  onDrag: ({ tree }: Store, x: number, y: number): Partial<Store> => ({
    tree: nonPatching(tree, ({ nodes }) => {
      const dx = x - sx
      const dy = y - sy

      for (const id of selected) {
        if (isNodeID(id)) {
          const oldR: Readonly<Rect> = beforeDrag.nodes[id].rect
          const newR: Rect = nodes[id].rect

          newR.x = oldR.x + dx
          newR.y = oldR.y + dy
        }
      }
    }),
    dragging: rset(selected.filter(isNodeID)),
  }),

  onEnd({ hovering, tree }: Store, x: number, y: number): Partial<Store> {
    const dx = x - sx
    const dy = y - sy

    const newParentID = isNodeID(hovering) ? hovering : rootID
    const newParentAbs = tree.index.absRects[newParentID]

    return {
      tree: patching({ ...tree, data: beforeDrag }, ({ nodes }) => {
        for (const id of selected) {
          if (newParentID === id || !isNodeID(id)) continue

          const oldParentID = tree.index.parents[id]
          if (oldParentID !== newParentID) {
            const oldParent = nodes[oldParentID]
            oldParent.children = oldParent.children.filter(x => x !== id)
            nodes[newParentID].children.push(id)

            // TODO extend new parent
            // p.rect = extendToFit(p.rect, childR)
          }

          const oldAbs = tree.index.absRects[id]
          const newR = nodes[id].rect
          newR.x = oldAbs.x + dx - newParentAbs.x
          newR.y = oldAbs.y + dy - newParentAbs.y
        }
      }),
      dragging: undefined,
    }
  },
})
