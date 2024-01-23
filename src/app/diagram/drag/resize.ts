import { type Rect } from "../../../lib/geometry.ts"
import { rset } from "../../../lib/ts.ts"
import { type NodeID, type NodesEdges } from "../data/data.ts"
import { nonPatching, patching } from "../data/history.ts"
import { type Store } from "../data/store.ts"
import { type DragBehavior2 } from "../drag.ts"

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
      ret.height -= deltaY
      break

    case ResizeSides.SOUTH:
      ret.height += deltaY
      break

    case ResizeSides.WEST:
      ret.x += deltaX
      ret.width -= deltaX
      break

    case ResizeSides.EAST:
      ret.width += deltaX
      break

    case "nw":
      ret.x += deltaX
      ret.width -= deltaX
      ret.y += deltaY
      ret.height -= deltaY
      break

    case "ne":
      ret.width += deltaX
      ret.y += deltaY
      ret.height -= deltaY
      break

    case ResizeSides.SOUTHWEST:
      ret.x += deltaX
      ret.width -= deltaX
      ret.height += deltaY
      break

    case ResizeSides.SOUTHEAST:
      ret.width += deltaX
      ret.height += deltaY
      break
  }

  return ret
}

export const dragSide = (
  beforeDrag: NodesEdges,
  id: NodeID,
  side: ResizeSide,
  sx: number,
  sy: number,
): DragBehavior2 => {
  const dragging = rset([id])
  return {
    x: sx,
    y: sy,

    onDrag: (store: Store, x: number, y: number): Partial<Store> => ({
      tree: nonPatching(store.tree, ({ nodes }) => {
        nodes[id].rect = onDragSide(
          sx,
          sy,
          beforeDrag.nodes[id].rect,
          side,
          x,
          y,
        )
      }),
      dragging,
    }),

    onEnd: (store: Store, x: number, y: number): Partial<Store> => ({
      tree: patching({ ...store.tree, data: beforeDrag }, ({ nodes }) => {
        nodes[id].rect = onDragSide(
          sx,
          sy,
          beforeDrag.nodes[id].rect,
          side,
          x,
          y,
        )
      }),
      dragging: undefined,
    }),
  }
}
