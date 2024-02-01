import { zoomIdentity, type ZoomTransform } from "d3-zoom"
import { type BBox } from "rbush"
import { createStore } from "solid-js/store"
import { type RSet } from "../../../lib/ts.ts"
import {
  emptyDataState,
  type DataState,
  type EdgeID,
  type NodeID,
} from "./data.ts"
import type { EdgeAnchor } from "./edge-anchor.ts"

export interface DraggingArrow {
  from: EdgeAnchor
  to: EdgeAnchor
}

export interface State {
  camera: ZoomTransform
  tree: DataState

  /** to detect drag targets */
  hovering?: NodeID | EdgeID

  /** drag end usually triggers text editing */
  editing?: NodeID | EdgeID

  /** empty object means dragging something without an id */
  dragging?: RSet<NodeID>

  brush?: BBox

  selected: RSet<NodeID | EdgeID>

  newArrow?: DraggingArrow
}

/** creates a proxied object that signals changes */
export const [store, setStore] = createStore<State>({
  camera: zoomIdentity,
  tree: emptyDataState(),
  selected: {},
})
