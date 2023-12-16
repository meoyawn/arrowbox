import { drag, type D3DragEvent } from "d3-drag"
import { isEl } from "../../../lib/dom"
import { type DragBehavior } from "./drag/behavior"
import { dragBrush, type DragBrush } from "./drag/brush"
import { dragNewArrow, type DragNewArrow } from "./drag/new-arrow"
import { dragNode, type DragNode } from "./drag/node"
import { dragSide, type DragResize } from "./drag/resize"
import { setStore, store } from "./store"

export const dragConstraints = {
  minHeight: 1,
} as const

export interface Variants {
  node: DragNode
  side: DragResize
  newArrow: DragNewArrow
  brush: DragBrush
}

export type DragSubj = Variants[keyof Variants] & {
  x: number
  y: number
}

export interface D3Event<Subj>
  extends D3DragEvent<SVGSVGElement, unknown, Subj> {
  sourceEvent: MouseEvent | TouchEvent
}

type DragID = keyof Variants

const behaviors: {
  [K in DragID]: DragBehavior<Variants[K]>
} = {
  node: dragNode,
  side: dragSide,
  newArrow: dragNewArrow,
  brush: dragBrush,
}

const decideSubj = ({ dragID, side }: DOMStringMap): DragID => {
  switch (true) {
    case Boolean(side):
      return "side"

    case !dragID:
      return "brush"

    default:
      return dragID as keyof Variants
  }
}

function dragSubj(this: SVGSVGElement, ev: D3Event<undefined>): DragSubj | 0 {
  const { target } = ev.sourceEvent
  if (!isEl(target)) return 0

  return behaviors[decideSubj(target.dataset)].subject(store, ev)
}

const onDrag = ({ subject, x, y }: D3Event<DragSubj>) => {
  return setStore(behaviors[subject.type].onDrag(store, x, y, subject))
}

const onEnd = ({ subject, x, y }: D3Event<DragSubj>) =>
  setStore(behaviors[subject.type].onEnd(store, x, y, subject))

export const d3Drag = drag<SVGSVGElement, unknown>()
  .subject(dragSubj)
  .on("drag", onDrag)
  .on("end", onEnd)
