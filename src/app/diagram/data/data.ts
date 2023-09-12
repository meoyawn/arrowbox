import { type ZoomTransform } from "d3-zoom"
import { enablePatches, produceWithPatches, setAutoFreeze } from "immer"
import { midPoint, type Rect, type Vec2 } from "../../../lib/geometry"
import { buildIndex } from "./graphIndex"
import { type DataState, type State } from "./state"

enablePatches()
setAutoFreeze(false)

export type NodeID = `n${string}`
export type EdgeID = `e${string}`

export const isNodeID = (id: unknown): id is NodeID =>
  typeof id === "string" && id.startsWith("n")

export const isEdgeID = (id: unknown): id is EdgeID =>
  typeof id === "string" && id.startsWith("e")

export const rootID = "nRoot"

export interface Node {
  id: NodeID
  text: string
  rect: Rect
  children: Array<NodeID>
}

export type EdgeAnchor =
  | { type: "node"; id: NodeID }
  | { type: "world"; world: Vec2 }

export const edgeAnchor = (
  nodes: Record<NodeID, Node>,
  a: EdgeAnchor,
): Vec2 => {
  switch (a.type) {
    case "node":
      return midPoint(nodes[a.id].rect)

    case "world":
      return a.world
  }
}

export interface Edge {
  id: EdgeID
  from: EdgeAnchor
  to: EdgeAnchor
}

export interface TheDiagram {
  nodes: Record<NodeID, Node>
  edges: Record<EdgeID, Edge>
}

export const worldPos = (transform: ZoomTransform, screen: Vec2): Vec2 =>
  transform.invert(screen)

export const screenPos = (transform: ZoomTransform, world: Vec2): Vec2 =>
  transform.apply(world)

export function patch(
  { data, history }: DataState,
  produceFn: (d: TheDiagram) => void,
): DataState {
  const [next, fwd, bwd] = produceWithPatches(data, produceFn)

  return {
    data: next,
    history: {
      forward: [...history.forward, fwd],
      backward: [...history.backward, bwd],
      index: history.index + 1,
    },
    index: buildIndex(next),
  }
}

export const genStr = (): string => {
  const neverZero: number = Date.now() + Math.random()
  const LATIN_LETTERS_AND_NUMBERS = 36
  return neverZero.toString(LATIN_LETTERS_AND_NUMBERS).replace(".", "")
}

export const genID = <P extends string>(prefix: P): `${P}${string}` =>
  `${prefix}${genStr()}`

export const emptyDiagram = (): TheDiagram => ({
  nodes: {
    [rootID]: {
      id: rootID,
      children: [],
      rect: { x: 0, y: 0, width: 0, height: 0 },
      text: "",
    },
  },
  edges: {},
})

export const addEdge = (
  state: State,
  draft: TheDiagram,
  subject: { from: NodeID },
  x: number,
  y: number,
): void => {
  const id = genID("e")
  const toNid = isEdgeID(state.hovering) ? undefined : state.hovering

  let toID: NodeID
  if (isNodeID(toNid)) {
    toID = toNid
  } else {
    toID = genID("n")
    const [wx, wy] = worldPos(state.camera, [x, y])
    draft.nodes[toID] = {
      id: toID,
      text: "",
      rect: { x: wx, y: wy, width: 100, height: 100 },
      children: [],
    }
  }

  draft.edges[id] = {
    id,
    from: { type: "node", id: subject.from },
    to: { type: "node", id: toID },
  }
}
