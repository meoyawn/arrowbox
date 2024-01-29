import {
  drag,
  type D3DragEvent,
  type DragBehavior,
  type DragContainerElement,
} from "d3-drag"
import { isEl } from "../../lib/dom.ts"
import { toArr } from "../../lib/ts.ts"
import { closestNodeID } from "./Diagram2.tsx"
import { type NodeID } from "./data/data.ts"
import { setStore, store, type State } from "./data/state.ts"
import { dragBrush } from "./drag/brush.ts"
import { dragNewArrow } from "./drag/new-arrow.ts"
import { dragNode } from "./drag/node.ts"
import { dragSide, type ResizeSide } from "./drag/resize.ts"

export function getNodeID(ev: Event): NodeID | undefined {
  const { target } = ev
  if (!isEl(target)) return

  return closestNodeID(target)
}

/** world coordinates */
export interface DragBehavior2 {
  readonly x: number
  readonly y: number

  onDrag(store: State, x: number, y: number): Partial<State>

  onEnd(store: State, x: number, y: number): Partial<State>
}

export function behaviorDrag<T extends Element>(
  subj: (ev: D3Event<undefined>) => DragBehavior2 | null,
  container?: DragContainerElement,
): DragBehavior<T, unknown, DragBehavior2> {
  let d = drag<T, unknown>()
  if (container) {
    d = d.container(container)
  }
  return d
    .subject(subj)
    .on("drag", ({ subject, x, y }: D3Event<DragBehavior2>) =>
      setStore(subject.onDrag(store, x, y)),
    )
    .on("end", ({ subject, x, y }: D3Event<DragBehavior2>) =>
      setStore(subject.onEnd(store, x, y)),
    ) as DragBehavior<T, unknown, DragBehavior2>
}

interface D3Event<Subj> extends D3DragEvent<Element, unknown, Subj> {
  sourceEvent: MouseEvent | TouchEvent
}

export const dragIDs = {
  node: "node",
  newArrow: "new-arrow",
  edgeFrom: "edge-from",
  edgeTo: "edge-to",
} as const

type DragID = (typeof dragIDs)[keyof typeof dragIDs]

const dragIDSet: ReadonlySet<DragID> = new Set(Object.values(dragIDs))

const isDragID = (id: unknown): id is DragID =>
  typeof id === "string" && dragIDSet.has(id as DragID)

/** world coordinates */
export const worldDragSubj = (ev: D3Event<undefined>): DragBehavior2 | null => {
  const { target, shiftKey } = ev.sourceEvent
  if (!isEl(target)) return null

  const { dragID, side } = target.dataset
  const data = store.tree.data

  if (side) {
    const nid = getNodeID(ev.sourceEvent)
    if (!nid) throw new Error("no nid")

    return dragSide(data, nid, side as ResizeSide, ev.x, ev.y)
  }

  if (!isDragID(dragID)) {
    return !shiftKey ? dragBrush(ev.x, ev.y) : null
  }

  switch (dragID) {
    case dragIDs.node: {
      const nid = getNodeID(ev.sourceEvent)
      if (!nid) throw new Error("no nid")

      const selArr = toArr(store.selected)
      return shiftKey
        ? dragNewArrow(nid, ev.x, ev.y)
        : dragNode(ev.x, ev.y, data, selArr.length ? selArr : [nid])
    }

    case dragIDs.newArrow: {
      const nid = getNodeID(ev.sourceEvent)
      if (!nid) throw new Error("no nid")

      return dragNewArrow(nid, ev.x, ev.y)
    }

    case dragIDs.edgeFrom: {
    }
  }
}
