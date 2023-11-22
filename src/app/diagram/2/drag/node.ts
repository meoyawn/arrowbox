import {
  nonPatching,
  patching,
  screenPos,
  worldPos,
  type NodeID,
  type NodesEdges,
} from "../../data/data"
import { type DragSubj } from "../drag"
import { type Store } from "../store"

export const dragNodeBehavior = {
  id: "node",
} as const

export interface DragNode {
  type: "node"
  id: NodeID
  dataBeforeDrag: NodesEdges
}

export function dragNodeSubj(store: Store, nid: NodeID): DragSubj {
  const { data } = store.tree
  const { rect } = data.nodes[nid]
  const [sx, sy] = screenPos(store.camera, [rect.x, rect.y])
  return { type: "node", x: sx, y: sy, id: nid, dataBeforeDrag: data }
}

export function onNodeDrag(
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

export function onNodeEnd(
  store: Store,
  x: number,
  y: number,
  subject: DragNode,
): Partial<Store> {
  const [wx, wy] = worldPos(store.camera, [x, y])
  return {
    tree: patching(
      { ...store.tree, data: subject.dataBeforeDrag },
      ({ nodes }) => {
        const rect = nodes[subject.id].rect
        rect.x = wx
        rect.y = wy
      },
    ),
    dragging: undefined,
  }
}
