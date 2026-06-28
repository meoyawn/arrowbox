import { isNodeID, type Edge, type EdgeID } from "../data/data.ts"
import type { EdgeAnchor } from "../data/edge-anchor.ts"
import { patching } from "../data/history.ts"
import type { DraggingArrow, State } from "../data/state.ts"
import type { DragBehavior2 } from "../drag.ts"
import { ROOT_ID } from "../data/ROOT_ID.ts"

type EdgeSide = "start" | "end"

function xxx(e: Edge, side: EdgeSide, drag: EdgeAnchor): DraggingArrow {
  switch (side) {
    case "start":
      return { from: drag, to: e.to }

    case "end":
      return { from: e.from, to: drag }
  }
}

export function dragEdge(
  id: EdgeID,
  side: EdgeSide,
  sx: number,
  sy: number,
): DragBehavior2 {
  const dragging = { [id]: 1 } as const

  return {
    x: sx,
    y: sy,
    onDrag: (
      { hovering, tree }: State,
      x: number,
      y: number,
    ): Partial<State> => ({
      newArrow: xxx(
        tree.data.edges[id],
        side,
        isNodeID(hovering)
          ? { type: "node", id: hovering }
          : { type: "relative", id: ROOT_ID, x, y },
      ),
      dragging,
    }),
    onEnd({ newArrow, tree }: State): Partial<State> {
      if (!newArrow) throw new Error("no new arrow")

      return {
        tree: patching(tree, data => {
          const e = data.edges[id]
          e.from = newArrow.from
          e.to = newArrow.to
        }),
        newArrow: undefined,
        dragging: undefined,
      }
    },
  }
}
