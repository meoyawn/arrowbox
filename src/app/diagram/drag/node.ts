import { type Rect } from "../../../lib/geometry.ts"
import { toSet } from "../../../lib/ts.ts"
import { absRect } from "../brushing.ts"
import {
  isNodeID,
  rootID,
  type EdgeID,
  type NodeID,
  type NodesEdges,
} from "../data/data.ts"
import { nonPatching, patching } from "../data/history.ts"
import { type State } from "../data/state.ts"
import { type DragBehavior2 } from "../drag.ts"

/** world coordinates */
export const dragNode = (
  sx: number,
  sy: number,
  beforeDrag: Readonly<NodesEdges>,
  selected: ReadonlyArray<NodeID | EdgeID>,
): DragBehavior2 => {
  const dragging = toSet(selected.filter(isNodeID))

  return {
    x: sx,
    y: sy,

    onDrag: ({ tree }: State, x: number, y: number): Partial<State> => ({
      tree: nonPatching(tree, ({ nodes }) => {
        const dx = x - sx
        const dy = y - sy

        for (const id of selected) {
          if (!isNodeID(id)) continue

          const oldR: Readonly<Rect> = beforeDrag.nodes[id].rect
          const newR: Rect = nodes[id].rect
          newR.x = oldR.x + dx
          newR.y = oldR.y + dy
        }
      }),
      dragging,
    }),

    onEnd({ hovering, tree }: State, x: number, y: number): Partial<State> {
      const dx = x - sx
      const dy = y - sy

      const newParentID = isNodeID(hovering) ? hovering : rootID

      return {
        tree: patching({ ...tree, data: beforeDrag }, ({ nodes }) => {
          const newParentsAbs = absRect(
            beforeDrag.nodes,
            tree.index.paths[newParentID],
          )

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

            const oldAbs = absRect(beforeDrag.nodes, tree.index.paths[id])
            const newR = nodes[id].rect
            newR.x = oldAbs.x + dx - newParentsAbs.x
            newR.y = oldAbs.y + dy - newParentsAbs.y
          }
        }),
        dragging: undefined,
      }
    },
  }
}
