import { type Rect } from "../../../../lib/geometry"
import { type NodeID, type NodesEdges } from "../../data/data"
import { nonPatching, patching } from "../../data/history.ts"
import { type DragBehavior2 } from "../drag"
import { type Store } from "../store"

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
): DragBehavior2 => ({
  x: sx,
  y: sy,

  onDrag: (store: Store, x: number, y: number): Partial<Store> => ({
    tree: nonPatching(store.tree, ({ nodes }) => {
      nodes[id].rect = onDragSide(sx, sy, beforeDrag.nodes[id].rect, side, x, y)
    }),
    dragging: id,
  }),

  onEnd: (store: Store, x: number, y: number): Partial<Store> => ({
    tree: patching({ ...store.tree, data: beforeDrag }, ({ nodes }) => {
      nodes[id].rect = onDragSide(sx, sy, beforeDrag.nodes[id].rect, side, x, y)
    }),
    dragging: undefined,
  }),
})
