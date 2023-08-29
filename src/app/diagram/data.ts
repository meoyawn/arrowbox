import { type ZoomTransform } from "d3-zoom"
import { enablePatches, produceWithPatches, setAutoFreeze } from "immer"
import { midPoint, type Rect, type Vec2 } from "../../lib/geometry"
import { setStore, type DataHistory, type State } from "./state"

enablePatches()
setAutoFreeze(false)

export type NodeID = `n${string}`
export type EdgeID = `e${string}`

export const isNodeID = (id: unknown): id is NodeID =>
  typeof id === "string" && id.startsWith("n")

export const isEdgeID = (id: unknown): id is EdgeID =>
  typeof id === "string" && id.startsWith("e")

export interface Node {
  id: NodeID
  text: string
  rect: Rect
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

export interface DataStore {
  nodes: Record<NodeID, Node>
  edges: Record<EdgeID, Edge>
}

export const worldPos = (transform: ZoomTransform, screen: Vec2): Vec2 =>
  transform.invert(screen)

export const screenPos = (transform: ZoomTransform, world: Vec2): Vec2 =>
  transform.apply(world)

export const patch = (
  data: DataStore,
  history: DataHistory,
  f: (d: DataStore) => void,
): {
  data: DataStore
  history: DataHistory
} => {
  const [next, fwd, bwd] = produceWithPatches(data, f)
  return {
    data: next,
    history: {
      index: history.index + 1,
      forward: [...history.forward, fwd],
      backward: [...history.backward, bwd],
    },
  }
}

export const genStr = (): string => {
  const neverZero: number = Date.now() + Math.random()
  const LATIN_LETTERS_AND_NUMBERS = 36
  return neverZero.toString(LATIN_LETTERS_AND_NUMBERS).replace(".", "")
}

export const genID = <P extends string>(prefix: P): `${P}${string}` =>
  `${prefix}${genStr()}`

export const addNode = (p: Vec2): void =>
  setStore(s => {
    const id = genID("n")
    const [x, y] = worldPos(s.camera, p)

    return patch(s.data, s.history, (data: DataStore) => {
      data.nodes[id] = {
        id,
        text: "",
        rect: { x, y, width: 100, height: 100 },
      }
    })
  })

export const addEdge = (
  state: State,
  draft: DataStore,
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
    }
  }

  draft.edges[id] = {
    id,
    from: { type: "node", id: subject.from },
    to: { type: "node", id: toID },
  }
}
