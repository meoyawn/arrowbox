import { type ZoomTransform } from "d3-zoom"
import { midPoint, type Rect, type Vec2 } from "../../../lib/geometry"
import { emptyHistory } from "./history.ts"
import { buildIndex } from "./indexing"
import { type DataState, type State } from "./state"

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
  id: NodeID
}

export type EdgeAnchor =
  | { type: "node"; id: NodeID }
  | { type: "relative"; id: NodeID; point: Vec2 }

export const edgeAnchor = (
  nodes: Record<NodeID, Node>,
  a: EdgeAnchor,
): Readonly<Vec2> => {
  switch (a.type) {
    case "node":
      return midPoint(nodes[a.id].rect)

    case "relative": {
      const [px, py] = a.point
      const { x, y } = nodes[a.id].rect
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

export const addEdge = (
  state: State,
  draft: NodesEdges,
  subject: { from: NodeID },
  x: number,
  y: number,
): NodeID | EdgeID => {
  const eid = genID("e")
  const toNid = isNodeID(state.hovering) ? state.hovering : undefined

  let ret: NodeID | EdgeID
  let toID: NodeID

  if (isNodeID(toNid)) {
    toID = toNid
    ret = eid
  } else {
    toID = genID("n")
    const [wx, wy] = worldPos(state.camera, [x, y])
    draft.nodes[toID] = {
      id: toID,
      text: {
        html: "",
        markdown: "",
      },
      rect: { x: wx, y: wy, width: 100, height: 100 },
      children: [],
    }
    ret = toID
  }

  draft.edges[eid] = {
    id: eid,
    from: subject.from,
    to: toID,
  }

  return ret
}

export const emptyDiagram = (): NodesEdges => ({
  nodes: {
    [rootID]: {
      id: rootID,
      children: [],
      rect: { x: 0, y: 0, width: 0, height: 0 },
      text: {
        html: "",
        markdown: "",
      },
    },
  },
  edges: {},
})

export const emptyDataState = (): DataState => ({
  data: emptyDiagram(),
  history: emptyHistory(),
  index: buildIndex(emptyDiagram()),
})
