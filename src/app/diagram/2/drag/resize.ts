import { isEl } from "../../../../lib/dom"
import { type Rect } from "../../../../lib/geometry"
import {
  isNodeID,
  worldPos,
  type NodeID,
  type NodesEdges,
} from "../../data/data"
import { nonPatching, patching } from "../../data/history.ts"
import { type D3Event } from "../drag"
import { type Store } from "../store"
import { type DragBehavior } from "./behavior"

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
  onStart: Readonly<Rect>,
  side: ResizeSide,
  x: number,
  y: number,
): Readonly<Rect> => {
  const deltaX = x - oldX
  const deltaY = y - oldY

  const ret: Rect = { ...onStart }

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

export interface DragResize {
  type: "side"
  dataBeforeDrag: NodesEdges
  id: NodeID
  side: ResizeSide
  x: number
  y: number
}

const dragBottomSubj = (store: Store, ev: D3Event<unknown>): DragResize => {
  const { target } = ev.sourceEvent
  if (!isEl(target)) throw new Error("no target")

  const node = target.closest("[data-nodeID]")
  const nid: NodeID | undefined = isEl(node)
    ? (node.dataset.nodeID as NodeID)
    : undefined

  if (!isNodeID(nid)) throw new Error("no nid")

  return {
    type: "side",
    x: ev.x,
    side: target.dataset.side as ResizeSide,
    y: ev.y,
    id: nid,
    dataBeforeDrag: store.tree.data,
  }
}

const onBottomDrag = (
  store: Store,
  x: number,
  y: number,
  subject: DragResize,
): Partial<Store> => {
  const [oldwx, oldwy] = worldPos(store.camera, [subject.x, subject.y])
  const [wx, wy] = worldPos(store.camera, [x, y])
  return {
    tree: nonPatching(store.tree, ({ nodes }) => {
      nodes[subject.id].rect = onDragSide(
        oldwx,
        oldwy,
        subject.dataBeforeDrag.nodes[subject.id].rect,
        subject.side,
        wx,
        wy,
      )
    }),
    dragging: subject.id,
  }
}

const onBottomEnd = (
  store: Store,
  x: number,
  y: number,
  subject: DragResize,
): Partial<Store> => {
  const [oldwx, oldwy] = worldPos(store.camera, [subject.x, subject.y])
  const [wx, wy] = worldPos(store.camera, [x, y])
  return {
    tree: patching(
      { ...store.tree, data: subject.dataBeforeDrag },
      ({ nodes }) => {
        nodes[subject.id].rect = onDragSide(
          oldwx,
          oldwy,
          subject.dataBeforeDrag.nodes[subject.id].rect,
          subject.side,
          wx,
          wy,
        )
      },
    ),
    dragging: undefined,
  }
}

export const dragSide: DragBehavior<DragResize> = {
  id: "side",
  subject: dragBottomSubj,
  onDrag: onBottomDrag,
  onEnd: onBottomEnd,
}
