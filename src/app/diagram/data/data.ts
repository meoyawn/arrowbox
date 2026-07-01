import type { ZoomTransform } from "d3-zoom"
import type { Rect, Vec2 } from "../../../lib/geometry"
import { ROOT_ID } from "./ROOT_ID"
import type { EdgeAnchor } from "./edge-anchor"
import type { ImmerHistory } from "./history"
import type { GraphIndex } from "./indexing"

export type GraphID = `g${string}`
export type NodeID = `n${string}`
export type EdgeID = `e${string}`

export interface DataState {
  data: Graph
  index: GraphIndex
  history: ImmerHistory
}

export const isPrefix = <P extends string>(
  id: unknown,
  prefix: P,
): id is `${P}${string}` =>
  typeof id === "string" && id.length > prefix.length && id.startsWith(prefix)

export const isNodeID = (id: unknown): id is NodeID => isPrefix(id, "n")

export const isEdgeID = (id: unknown): id is EdgeID => isPrefix(id, "e")

export const isGraphID = (id: unknown): id is GraphID => isPrefix(id, "g")

export interface GraphText {
  markdown: string
  html: string
}

export type NodeShape = "rect" | "ellipse"

/** persisted */
export interface Node {
  readonly id: NodeID
  text: GraphText
  rect: Rect
  children: Array<NodeID>
  shape: NodeShape
}

/** persisted */
export interface Edge {
  id: EdgeID
  from: EdgeAnchor
  to: EdgeAnchor
  text: GraphText
}

/** persisted */
export interface Graph {
  readonly id: GraphID
  title: string
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

export const emptyGraph = (
  id: GraphID = genID("g"),
  title = "Untitled 1",
): Graph => ({
  id,
  title,
  nodes: {
    [ROOT_ID]: {
      id: ROOT_ID,
      children: [],
      rect: { x: 0, y: 0, width: 0, height: 0 },
      text: { html: "", markdown: "" },
      shape: "rect",
    },
  },
  edges: {},
})
