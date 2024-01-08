import { extendToFit, type Rect } from "../../../../lib/geometry"
import { isNodeID, type NodeID, type NodesEdges } from "../../data/data"
import { nonPatching, patching } from "../../data/history.ts"
import { type DragBehavior2 } from "../drag.ts"
import { type Store } from "../store"

/** world coordinates */
export const dragNode = (
  id: NodeID,
  beforeDrag: NodesEdges,
  init: Rect,
): DragBehavior2 => ({
  x: init.x,
  y: init.y,

  onDrag: ({ tree }: Store, x: number, y: number): Partial<Store> => ({
    tree: nonPatching(tree, ({ nodes }) => {
      const r = nodes[id].rect
      r.x = x
      r.y = y
    }),
    dragging: id,
  }),

  onEnd({ hovering, tree }: Store, x: number, y: number): Partial<Store> {
    const above = isNodeID(hovering) ? hovering : undefined
    return {
      tree: patching({ ...tree, data: beforeDrag }, ({ nodes }) => {
        const childR = nodes[id].rect

        if (above && above !== id) {
          const oldParent = nodes[tree.index.parents[id]]
          oldParent.children = oldParent.children.filter(x => x === id)

          nodes[above].children.push(id)

          const p = nodes[above]
          p.rect = extendToFit(p.rect, childR)

          // TODO set child coordinates by offsetting from parent
        } else {
          childR.x = x
          childR.y = y
        }
      }),
      dragging: undefined,
    }
  },
})
