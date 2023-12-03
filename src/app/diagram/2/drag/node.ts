import { extendToFit } from "../../../../lib/geometry"
import {
  isNodeID,
  nonPatching,
  patching,
  screenPos,
  worldPos,
  type NodeID,
  type NodesEdges,
} from "../../data/data"
import { type DragSubj } from "../drag"
import { type Store } from "../store"
import { getNID, type DragBehavior } from "./behavior"

export interface DragNode {
  type: "node"
  id: NodeID
  dataBeforeDrag: NodesEdges
}

function dragNodeSubj(store: Store, nid: NodeID): DragSubj {
  const { data } = store.tree
  const { rect } = data.nodes[nid]
  const [sx, sy] = screenPos(store.camera, [rect.x, rect.y])
  return { type: "node", x: sx, y: sy, id: nid, dataBeforeDrag: data }
}

function onNodeDrag(
  store: Store,
  x: number,
  y: number,
  subject: DragNode,
): Partial<Store> {
  const [wx, wy] = worldPos(store.camera, [x, y])

  return {
    tree: nonPatching(store.tree, ({ nodes }) => {
      const r = nodes[subject.id].rect
      r.x = wx
      r.y = wy
    }),
    dragging: subject.id,
  }
}

function onNodeEnd(
  store: Store,
  x: number,
  y: number,
  subject: DragNode,
): Partial<Store> {
  const [wx, wy] = worldPos(store.camera, [x, y])
  const parent = isNodeID(store.hovering) ? store.hovering : undefined
  return {
    tree: patching(
      { ...store.tree, data: subject.dataBeforeDrag },
      ({ nodes }) => {
        const childR = nodes[subject.id].rect
        childR.x = wx
        childR.y = wy

        if (parent && parent !== subject.id) {
          const p = nodes[parent]
          p.rect = extendToFit(p.rect, childR)
        }
      },
    ),
    dragging: undefined,
  }
}

export const dragNode: DragBehavior<DragNode> = {
  id: "node",
  subject(store, ev) {
    const nid = getNID(ev.sourceEvent)
    if (!nid) throw new Error("no nid")
    return dragNodeSubj(store, nid)
  },
  onDrag: onNodeDrag,
  onEnd: onNodeEnd,
}
