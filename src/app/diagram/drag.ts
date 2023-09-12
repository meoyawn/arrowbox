import { drag, type D3DragEvent } from "d3-drag"
import { produce } from "immer"
import { isEl } from "../../lib/dom"
import { midPoint } from "../../lib/geometry"
import {
  addEdge,
  patch,
  screenPos,
  worldPos,
  type NodeID,
  type TheDiagram,
} from "./data/data"
import { setStore, store } from "./data/state"

interface SubjectScreenSpace {
  x: number
  y: number
}

interface NewArrow {
  type: "new-arrow"
  from: NodeID
  to: NodeID | undefined
}

interface DragNode {
  type: "node"
  id: NodeID
}

interface BeforeMove {
  data: TheDiagram
}

interface DragBrush {
  type: "brush"
}

type DragSubj = SubjectScreenSpace &
  BeforeMove &
  (NewArrow | DragNode | DragBrush)

interface Devent extends D3DragEvent<HTMLElement, unknown, DragSubj> {
  sourceEvent: MouseEvent | TouchEvent
}

type DataDrag = "mid" | "corner" | "node"

function dragSubj(
  this: HTMLElement,
  { sourceEvent, x, y }: Devent,
): DragSubj | void {
  const { target } = sourceEvent
  if (!isEl(target)) return

  const node = target.closest("[data-nodeID]")
  const nid: NodeID | undefined = isEl(node)
    ? (node.dataset.nodeID as NodeID)
    : undefined

  const dataDrag = target.dataset.drag as DataDrag
  const { data } = store.data

  switch (true) {
    case nid && dataDrag === "node": {
      const { rect } = data.nodes[nid as NodeID]
      const [sx, sy] = screenPos(store.camera, [rect.x, rect.y])
      return {
        x: sx,
        y: sy,
        type: "node",
        id: nid as NodeID,
        data,
      }
    }

    case nid && dataDrag === "mid": {
      return {
        x,
        y,
        type: "new-arrow",
        from: nid as NodeID,
        to: undefined,
        data,
      }
    }

    default:
      return { type: "brush", x, y, data }

    case dataDrag === "corner":
      // TODO drag corner
      break

    case true:
      // TODO drag edgeFrom
      break

    case true:
      // TODO drag edgeTo
      break
  }
}

const onDrag = (dev: Devent): void => {
  const { subject, x, y, dx, dy } = dev
  const world = worldPos(store.camera, [x, y])
  switch (subject.type) {
    case "brush": {
      setStore({
        brush: {
          x: Math.min(x, x + dx),
          y: Math.min(y, y + dy),
          width: Math.abs(dx),
          height: Math.abs(dy),
        },
      })
      break
    }

    case "new-arrow": {
      const fromWorld = subject.from
        ? midPoint(store.data.data.nodes[subject.from].rect)
        : world
      const toWorld = world
      setStore({ newArrow: { fromWorld, toWorld } })
      break
    }

    case "node": {
      const [wx, wy] = worldPos(store.camera, [x, y])
      setStore({
        data: produce(subject.data, ({ nodes }) => {
          const rect = nodes[subject.id].rect
          rect.x = wx
          rect.y = wy
        }),
        dragging: subject.id,
      })
    }
  }
}

const onEnd = (de: Devent): void => {
  const { subject, x, y } = de
  switch (subject.type) {
    case "new-arrow": {
      setStore({
        newArrow: undefined,
        data: patch({ ...store.data, data: subject.data }, d =>
          addEdge(store, d, subject, x, y),
        ),
      })
      break
    }

    case "node": {
      const [wx, wy] = worldPos(store.camera, [x, y])
      setStore({
        data: patch({ ...store.data, data: subject.data }, ({ nodes }) => {
          const rect = nodes[subject.id].rect
          rect.x = wx
          rect.y = wy
        }),
        dragging: undefined,
      })
      break
    }

    case "brush": {
      setStore({ brush: undefined })
    }
  }
}

export const d3Drag = drag<HTMLDivElement, unknown>()
  .subject(dragSubj)
  .on("drag", onDrag)
  .on("end", onEnd)
