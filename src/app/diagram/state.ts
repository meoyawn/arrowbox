import { zoomIdentity, type ZoomTransform } from "d3-zoom"
import { type Patch } from "immer"
import { createStore } from "solid-js/store"
import { type Rect, type Vec2 } from "../../lib/geometry"
import { type DataStore, type EdgeID, type NodeID } from "./data"

export interface NewArrowState {
  fromWorld: Vec2
  toWorld: Vec2
}

export interface DataHistory {
  index: number
  forward: ReadonlyArray<ReadonlyArray<Patch>>
  backward: ReadonlyArray<ReadonlyArray<Patch>>
}

export interface State {
  camera: ZoomTransform
  data: DataStore
  history: DataHistory
  selected: Record<NodeID | EdgeID, true>

  brush?: Rect
  newArrow?: NewArrowState

  hovering?: NodeID | EdgeID
  dragging?: NodeID | EdgeID
  editing?: NodeID | EdgeID
}

export const [store, setStore] = createStore<State>({
  camera: zoomIdentity,
  data: { nodes: {}, edges: {} },
  selected: {},
  history: { index: -1, forward: [], backward: [] },
})
