import { type ZoomTransform } from "d3-zoom"
import { midPoint, type Rect, type Vec2 } from "../../../lib/geometry"
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

export const rootID = "nRoot"

export interface Node {
  id: NodeID
  text: {
    html: string
    markdown: string
  }
  rect: Rect
  children: Array<NodeID>
}

export interface IdRect extends Rect {
  readonly id: NodeID
}

export type EdgeAnchor =
  | { type: "node"; id: NodeID }
  | { type: "relative"; id: NodeID; point: Vec2 }

export const anchoringTo = (ea: EdgeAnchor, id: NodeID): boolean => ea.id === id

export const edgeAnchor = (
  r: Readonly<Rect>,
  a: Readonly<EdgeAnchor>,
  parent: Readonly<Rect>,
): Readonly<Vec2> => {
  switch (a.type) {
    case "node": {
      const [x, y] = midPoint(r)
      return [x + parent.x, y + parent.y]
    }

    case "relative": {
      const [px, py] = a.point
      const { x, y } = r
      return [px + x + parent.x, py + y + parent.y]
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

export const emptyDiagram = (): NodesEdges => ({
  nodes: {
    [rootID]: {
      id: rootID,
      children: [],
      rect: { x: 0, y: 0, width: 0, height: 0 },
      text: { html: "", markdown: "" },
    },
  },
  edges: {},
})

export const emptyDataState = (): DataState => ({
  data: emptyDiagram(),
  history: emptyHistory(),
  index: buildIndex(emptyDiagram()),
})
