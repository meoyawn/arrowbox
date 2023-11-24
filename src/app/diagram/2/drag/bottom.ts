import {
  nonPatching,
  patching,
  type NodeID,
  type NodesEdges,
} from "../../data/data"
import { type DragSubj } from "../drag"
import { type Store } from "../store"
import { getNID, type DragBehavior } from "./behavior"

export interface DragBottom {
  type: "bottom"
  id: NodeID
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
  _: number,
  y: number,
  subject: DragBottom,
): Partial<Store> {
  const height = Math.max(1, y / store.camera.k)
  return {
    tree: nonPatching(store.tree, ({ nodes }) => {
      nodes[subject.id].rect.height = height
    }),
    dragging: subject.id,
  }
}

function onBottomEnd(
  store: Store,
  _: number,
  y: number,
  subject: DragBottom,
): Partial<Store> {
  const height = Math.max(1, y / store.camera.k)
  return {
    tree: patching(
      { ...store.tree, data: subject.dataBeforeDrag },
      ({ nodes }) => {
        const r = nodes[subject.id].rect
        r.height = height
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
