import {
  nonPatching,
  patching,
  worldPos,
  type NodeID,
  type NodesEdges,
} from "../../data/data"
import { type DragSubj } from "../drag"
import { type Store } from "../store"
import { getNID, type DragBehavior } from "./behavior"
import { onDragSide, type Side } from "./resize"

export interface DragBottom {
  type: "bottom"
  id: NodeID
  dataBeforeDrag: NodesEdges
  x: number
  y: number
}

export interface DragSide {
  type: "side"
  id: NodeID
  side: Side
  dataBeforeDrag: NodesEdges
}

function dragBottomSubj(store: Store, nid: NodeID): DragSubj {
  const { data } = store.tree
  const { rect } = data.nodes[nid]
  return {
    type: "bottom",
    x: 0,
    y: store.camera.k + rect.height,
    id: nid,
    dataBeforeDrag: data,
  }
}

function onBottomDrag(
  store: Store,
  x: number,
  y: number,
  subject: DragBottom,
): Partial<Store> {
  const [oldwx, oldwy] = worldPos(store.camera, [subject.x, subject.y])
  const [wx, wy] = worldPos(store.camera, [x, y])
  return {
    tree: nonPatching(store.tree, ({ nodes }) => {
      nodes[subject.id].rect = onDragSide(
        oldwx,
        oldwy,
        subject.dataBeforeDrag.nodes[subject.id].rect,
        "s",
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
  subject: DragBottom,
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
          "s",
          wx,
          wy,
        )
      },
    ),
    dragging: undefined,
  }
}

export const dragBottom: DragBehavior<DragBottom> = {
  id: "bottom",
  subject(store, x) {
    const nid = getNID(x)
    if (!nid) throw new Error("no nid")
    return dragBottomSubj(store, nid)
  },
  onDrag: onBottomDrag,
  onEnd: onBottomEnd,
}
