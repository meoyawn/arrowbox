import type { Rect } from "../../../lib/geometry.ts"
import type { KeySet } from "../../../lib/ts.ts"
import type { Graph, NodeID } from "../data/data.ts"
import { nonPatching, patching } from "../data/history.ts"
import type { State } from "../data/state.ts"
import type { DragBehavior2 } from "../drag.ts"

export const dragConstraints = {
  minHeight: 1,
} as const

export const ResizeSides = {
  NORTH: "n",
  SOUTH: "s",
  WEST: "w",
  EAST: "e",
  NORTHWEST: "nw",
  NORTHEAST: "ne",
  SOUTHWEST: "sw",
  SOUTHEAST: "se",
} as const

export type ResizeSide = (typeof ResizeSides)[keyof typeof ResizeSides]

const onDragSide = (
  oldX: number,
  oldY: number,
  original: Readonly<Rect>,
  side: ResizeSide,
  x: number,
  y: number,
): Readonly<Rect> => {
  const deltaX = x - oldX
  const deltaY = y - oldY

  const ret: Rect = { ...original }

  switch (side) {
    case ResizeSides.NORTH:
      ret.y += deltaY
      ret.height = Math.max(1, ret.height - deltaY)
      break

    case ResizeSides.SOUTH:
      ret.height = Math.max(1, ret.height + deltaY)
      break

    case ResizeSides.WEST:
      ret.x += deltaX
      ret.width = Math.max(1, ret.width - deltaX)
      break

    case ResizeSides.EAST:
      ret.width = Math.max(1, ret.width + deltaX)
      break

    case ResizeSides.NORTHWEST:
      ret.x += deltaX
      ret.width = Math.max(1, ret.width - deltaX)
      ret.y += deltaY
      ret.height = Math.max(1, ret.height - deltaY)
      break

    case ResizeSides.NORTHEAST:
      ret.width = Math.max(1, ret.width + deltaX)
      ret.y += deltaY
      ret.height = Math.max(1, ret.height - deltaY)
      break

    case ResizeSides.SOUTHWEST:
      ret.x += deltaX
      ret.width = Math.max(1, ret.width - deltaX)
      ret.height = Math.max(1, ret.height + deltaY)
      break

    case ResizeSides.SOUTHEAST:
      ret.width = Math.max(1, ret.width + deltaX)
      ret.height = Math.max(1, ret.height + deltaY)
      break
  }

  return ret
}

function resizeNode(
  nodes: Graph["nodes"],
  beforeDrag: Readonly<Graph>,
  id: NodeID,
  side: ResizeSide,
  sx: number,
  sy: number,
  x: number,
  y: number,
): void {
  const original = beforeDrag.nodes[id].rect
  const next = onDragSide(sx, sy, original, side, x, y)
  const childX = (next.width - original.width) / 2
  const childY = (next.height - original.height) / 2

  nodes[id].rect = next

  for (const childID of beforeDrag.nodes[id].children) {
    const rect = nodes[childID].rect
    const originalChild = beforeDrag.nodes[childID].rect
    rect.x = originalChild.x + childX
    rect.y = originalChild.y + childY
  }
}

export const dragSide = (
  beforeDrag: Graph,
  id: NodeID,
  side: ResizeSide,
  sx: number,
  sy: number,
): DragBehavior2 => {
  const dragging: KeySet<NodeID> = { [id]: 1 }

  return {
    x: sx,
    y: sy,

    onDrag: (store: State, x: number, y: number): Partial<State> => ({
      tree: nonPatching(store.tree, ({ nodes }) => {
        resizeNode(nodes, beforeDrag, id, side, sx, sy, x, y)
      }),
      dragging,
    }),

    onEnd: (store: State, x: number, y: number): Partial<State> => ({
      tree: patching({ ...store.tree, data: beforeDrag }, ({ nodes }) => {
        resizeNode(nodes, beforeDrag, id, side, sx, sy, x, y)
      }),
      dragging: undefined,
    }),
  }
}
