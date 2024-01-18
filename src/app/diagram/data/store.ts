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

export interface NewArrow {
  from: NodeID
  toX: number
  toY: number
}

export interface Store {
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

  newArrow?: NewArrow
}

/** creates a proxied object that signals changes */
export const [store, setStore] = createStore<Store>({
  camera: zoomIdentity,
  tree: emptyDataState(),
  selected: {},
})
