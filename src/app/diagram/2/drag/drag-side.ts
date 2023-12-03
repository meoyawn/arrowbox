import { isEl } from "../../../../lib/dom"
import {
  isNodeID,
  nonPatching,
  patching,
  worldPos,
  type NodeID,
  type NodesEdges,
} from "../../data/data"
import { type D3Event } from "../drag"
import { type Store } from "../store"
import { type DragBehavior } from "./behavior"
import { onDragSide, type Side } from "./resize"

export interface DragSide {
  type: "side"
  dataBeforeDrag: NodesEdges
  id: NodeID
  side: Side
  x: number
  y: number
}

function dragBottomSubj(store: Store, ev: D3Event<unknown>): DragSide {
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
    side: target.dataset.side as Side,
    y: ev.y,
    id: nid,
    dataBeforeDrag: store.tree.data,
  }
}

function onBottomDrag(
  store: Store,
  x: number,
  y: number,
  subject: DragSide,
): Partial<Store> {
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

function onBottomEnd(
  store: Store,
  x: number,
  y: number,
  subject: DragSide,
): Partial<Store> {
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

export const dragSide: DragBehavior<DragSide> = {
  id: "side",
  subject: dragBottomSubj,
  onDrag: onBottomDrag,
  onEnd: onBottomEnd,
}
