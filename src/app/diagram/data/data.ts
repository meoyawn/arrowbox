import { type ZoomTransform } from "d3-zoom"
import { type Rect, type Vec2 } from "../../../lib/geometry"
import type { EdgeAnchor } from "./edge-anchor.ts"
import { emptyHistory, type ImmerHistory } from "./history.ts"
import { buildIndex, type GraphIndex } from "./indexing"

export interface DataState {
  data: Graph
  index: GraphIndex
  history: ImmerHistory
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
}

export type NodeShape = "rect" | "ellipse"

/** persisted */
export interface Node {
  readonly id: NodeID
  text: NodeText
  rect: Rect
  children: Array<NodeID>
  shape: NodeShape
}

/** persisted */
export interface Edge {
  id: EdgeID
  from: EdgeAnchor
  to: EdgeAnchor
}

/** persisted */
export interface Graph {
  nodes: Record<NodeID, Node>
  edges: Record<EdgeID, Edge>
}

export interface IdRect extends Rect {
  readonly id: NodeID
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

export const rootID = "nRoot" satisfies NodeID

export const emptyGraph = (): Graph => ({
  nodes: {
    [rootID]: {
      id: rootID,
      children: [],
      rect: { x: 0, y: 0, width: 0, height: 0 },
      text: { html: "", markdown: "" },
      shape: "rect",
    },
  },
  edges: {},
})

export const emptyDataState = (data: Graph = emptyGraph()): DataState => ({
  data,
  history: emptyHistory(),
  index: buildIndex(data),
})
