import { drag, type D3DragEvent } from "d3-drag"
import { isEl } from "../../../lib/dom"
import { isNodeID, type NodeID } from "../data/data"
import { type DragBehavior } from "./drag/behavior"
import { dragBottom, type DragBottom } from "./drag/bottom"
import { dragBrush, type DragBrush } from "./drag/brush"
import { dragNewArrow, type DragNewArrow } from "./drag/new-arrow"
import { dragNode, type DragNode } from "./drag/node"
import { setStore, store } from "./store"

export const dragConstraints = {
  minHeight: 1,
} as const

export interface Variants {
  node: DragNode
  bottom: DragBottom
  newArrow: DragNewArrow
  brush: DragBrush
}

export type DragSubj = Variants[keyof Variants] & {
  x: numbere
  y: number
}

export interface D3Event<Subj>
  extends D3DragEvent<SVGSVGElement, unknown, Subj> {
  sourceEvent: MouseEvent | TouchEvent
}

const nodeDragBehaviors: {
  [K in keyof Variants]: DragBehavior<Variants[K]>
} = {
  node: dragNode,
  bottom: dragBottom,
  newArrow: dragNewArrow,
  brush: dragBrush,
}

function dragSubj(this: SVGSVGElement, ev: D3Event<undefined>): DragSubj | 0 {
  const { sourceEvent } = ev
  const { target } = sourceEvent
  if (!isEl(target)) return 0

  const node = target.closest("[data-nodeID]")
  const nid: NodeID | undefined = isEl(node)
    ? (node.dataset.nodeID as NodeID)
    : undefined

  if (!isNodeID(nid)) return 0

  return nodeDragBehaviors[target.dataset.dragID as keyof Variants].subject(
    store,
    sourceEvent,
  )
}

const onDrag = ({ subject, x, y }: D3Event<DragSubj>) =>
  setStore(nodeDragBehaviors[subject.type].onDrag(store, x, y, subject))

const onEnd = ({ subject, x, y }: D3Event<DragSubj>) =>
  setStore(nodeDragBehaviors[subject.type].onEnd(store, x, y, subject))

export const d3Drag = drag<SVGSVGElement, unknown>()
  .subject(dragSubj)
  .on("drag", onDrag)
  .on("end", onEnd)
