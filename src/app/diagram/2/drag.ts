import { drag, type D3DragEvent } from "d3-drag"
import { isEl } from "../../../lib/dom"
import { isNodeID, type NodeID } from "../data/data"
import {
  dragBottomSubj,
  onBottomDrag,
  onBottomEnd,
  type DragBottom,
} from "./drag/bottom"
import {
  dragNodeBehavior,
  dragNodeSubj,
  onNodeDrag,
  onNodeEnd,
  type DragNode,
} from "./drag/node"
import { setStore, store } from "./store"

export const dragIDs = {
  node: "node",
  newArrow: "new-arrow",
  bottom: "bottom",
} as const

export const dragConstraints = {
  minHeight: 1,
} as const

type DragVariant =
  | {
      type: "new-arrow"
      from: NodeID
    }
  | {
      type: "brushing"
    }
  | DragBottom
  | DragNode

export type DragSubj = {
  x: number
  y: number
} & DragVariant

interface D3Event extends D3DragEvent<SVGSVGElement, unknown, DragSubj> {
  sourceEvent: MouseEvent | TouchEvent
}

type Did = typeof dragIDs
type DidV = Did[keyof Did]

function dragSubj(this: SVGSVGElement, { sourceEvent }: D3Event): DragSubj | 0 {
  const { target } = sourceEvent
  if (!isEl(target)) return 0

  const node = target.closest("[data-nodeID]")
  const nid: NodeID | undefined = isEl(node)
    ? (node.dataset.nodeID as NodeID)
    : undefined

  if (!isNodeID(nid)) return 0

  switch (target.dataset.dragID as DidV) {
    case "bottom": {
      return dragBottomSubj(store, nid)
    }

    case "node": {
      return dragNodeSubj(store, nid)
    }

    case "new-arrow": {
      return { type: "new-arrow" }
    }
  }
}

const nodeDragBehaviors = {
  node: dragNodeBehavior,
} as const

function onDrag(e: D3Event): 0 {
  const { subject, x, y } = e
  switch (subject.type) {
    case "node": {
      setStore(onNodeDrag(store, x, y, subject))
      return 0
    }

    case "bottom": {
      setStore(onBottomDrag(store, x, y, subject))
      return 0
    }

    case "brushing":
      return 0

    case "new-arrow":
      return 0
  }
}

function onEnd({ subject, x, y }: D3Event): 0 {
  switch (subject.type) {
    case "bottom": {
      setStore(onBottomEnd(store, x, y, subject))
      return 0
    }

    case "node": {
      setStore(onNodeEnd(store, x, y, subject))
      return 0
    }

    case "new-arrow":
      // who are we hovering?
      return 0

    case "brushing":
      return 0
  }
}

export const d3Drag = drag<SVGSVGElement, unknown>()
  .subject(dragSubj)
  .on("drag", onDrag)
  .on("end", onEnd)
