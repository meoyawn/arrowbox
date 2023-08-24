import { type ZoomTransform } from "d3-zoom"
import { enablePatches, produceWithPatches } from "immer"
import { type State } from "./state"

enablePatches()

type NodeID = `n${string}`

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Node {
  id: NodeID
  text: string
  rect: Rect
}

export interface DataStore {
  nodes: Record<NodeID, Node>
}

type Vec2 = [x: number, y: number]

export const worldPos = (transform: ZoomTransform, screen: Vec2): Vec2 =>
  transform.invert(screen)

export const screenPos = (transform: ZoomTransform, world: Vec2): Vec2 =>
  transform.apply(world)

export const addNode = (store: State, p: Vec2): DataStore => {
  const id: NodeID = `n${Math.random()}`
  const [x, y] = worldPos(store.camera, p)
  const [next] = produceWithPatches(store.data, (data: DataStore) => {
    data.nodes[id] = {
      id,
      text: "",
      rect: { x, y, width: 100, height: 100 },
    }
  })
  return next
}
