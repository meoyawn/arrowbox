import { type ZoomTransform } from "d3-zoom"
import {
  midPoint,
  pointOnRect,
  type Rect,
  type Vec2,
} from "../../../lib/geometry"
import { absRect } from "../brushing.ts"
import { emptyHistory, type ImmerHistory } from "./history.ts"
import { buildIndex, type GraphIndex } from "./indexing"

export interface DataState {
  data: NodesEdges
  history: ImmerHistory
  index: GraphIndex
}

export type GraphID = `g${string}`
export type NodeID = `n${string}`
export type EdgeID = `e${string}`

export const isNodeID = (id: unknown): id is NodeID =>
  typeof id === "string" && id.startsWith("n")

export const isEdgeID = (id: unknown): id is EdgeID =>
  typeof id === "string" && id.startsWith("e")

interface NodeText {
  markdown: string
  html: string
  htmlWidth: number
  htmlHeight: number
}

export type NodeShape = "rect" | "ellipse"

export interface Node {
  id: NodeID
  text: NodeText
  rect: Rect
  children: Array<NodeID>
  shape: NodeShape
}

export interface IdRect extends Rect {
  readonly id: NodeID
}

export type EdgeAnchor =
  | { type: "node"; id: NodeID }
  | { type: "relative"; id: NodeID; point: Vec2 }

const pointOnShape = (
  s: NodeShape,
  { height, width, x, y }: Rect,
  other: Rect,
): Vec2 => {
  const [mx, my] = midPoint(other)
  switch (s) {
    case "rect":
      return pointOnRect(mx, my, x, y, x + width, y + height)

    case "ellipse":
      throw new Error("not implemented")
  }
}

export function absEdgeAnchor(
  { data, index }: DataState,
  a: EdgeAnchor,
  otherID: NodeID,
): Vec2 {
  const r = absRect(data.nodes, index.paths[a.id])
  const other = absRect(data.nodes, index.paths[otherID])
  switch (a.type) {
    case "node":
      return pointOnShape(data.nodes[a.id].shape, r, other)

    case "relative": {
      const [px, py] = a.point
      const { x, y } = r
      return [px + x, py + y]
    }
  }
}

export interface Edge {
  id: EdgeID
  from: EdgeAnchor
  to: EdgeAnchor
}

export interface NodesEdges {
  nodes: Record<NodeID, Node>
  edges: Record<EdgeID, Edge>
}

export const worldPos = (transform: ZoomTransform, screen: Vec2): Vec2 =>
  transform.invert(screen)

export const screenPos = (transform: ZoomTransform, world: Vec2): Vec2 =>
  transform.apply(world)

export const genStr = (): string => {
  const neverZero: number = Date.now() + Math.random()
  const LATIN_LETTERS_AND_NUMBERS = 36
  return neverZero.toString(LATIN_LETTERS_AND_NUMBERS).replace(".", "")
}

export const genID = <P extends string>(prefix: P): `${P}${string}` =>
  `${prefix}${genStr()}`

export const rootID = "nRoot"

export const emptyDiagram = (): NodesEdges => ({
  nodes: {
    [rootID]: {
      id: rootID,
      children: [],
      rect: { x: 0, y: 0, width: 0, height: 0 },
      text: { html: "", markdown: "", htmlHeight: 0, htmlWidth: 0 },
      shape: "rect",
    },
  },
  edges: {},
})

export const emptyDataState = (): DataState => ({
  data: emptyDiagram(),
  history: emptyHistory(),
  index: buildIndex(emptyDiagram()),
})
