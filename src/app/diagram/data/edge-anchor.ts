import { destructure } from "@solid-primitives/destructure"
import { type Accessor } from "solid-js"
import {
  midPoint,
  pointOnRect,
  type Rect,
  type Vec2,
} from "../../../lib/geometry.ts"
import { absRect } from "../brushing.ts"
import type { DataState, NodeID, NodeShape } from "./data.ts"
import { type State } from "./state.ts"

export type EdgeAnchor =
  | { type: "node"; id: NodeID }
  | { type: "relative"; id: NodeID; x: number; y: number }

function pointOnShape(
  s: NodeShape,
  { height, width, x, y }: Rect,
  lineX: number,
  lineY: number,
): Vec2 {
  switch (s) {
    case "rect":
      return pointOnRect(lineX, lineY, x, y, x + width, y + height)

    case "ellipse":
      throw new Error("not implemented")
  }
}

function origin({ data, index }: DataState, a: EdgeAnchor): Vec2 {
  const r = absRect(data.nodes, index.paths[a.id])
  switch (a.type) {
    case "node":
      return midPoint(r)

    case "relative":
      return [r.x + a.x, r.y + a.y]
  }
}

function absEdgeAnchor(ds: DataState, a: EdgeAnchor, other: EdgeAnchor): Vec2 {
  const { data, index } = ds
  const r = absRect(data.nodes, index.paths[a.id])
  switch (a.type) {
    case "node": {
      const [lineX, lineY] = origin(ds, other)
      return pointOnShape(data.nodes[a.id].shape, r, lineX, lineY)
    }

    case "relative": {
      return [r.x + a.x, r.y + a.y]
    }
  }
}

export const createAnchors = (
  store: State,
  aFrom: Accessor<EdgeAnchor>,
  aTo: Accessor<EdgeAnchor>,
): {
  fromX: Accessor<number>
  fromY: Accessor<number>
  toX: Accessor<number>
  toY: Accessor<number>
} => {
  const from = () => absEdgeAnchor(store.tree, aFrom(), aTo())
  const [fromX, fromY] = destructure(from)

  const to = () => absEdgeAnchor(store.tree, aTo(), aFrom())
  const [toX, toY] = destructure(to)

  return { fromX, fromY, toX, toY }
}
