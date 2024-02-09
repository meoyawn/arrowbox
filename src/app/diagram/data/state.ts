import { zoomIdentity, type ZoomTransform } from "d3-zoom"
import { type BBox } from "rbush"
import { createStore } from "solid-js/store"
import { type KeySet } from "../../../lib/ts.ts"
import {
  emptyDataState,
  type DataState,
  type EdgeID,
  type NodeID,
} from "./data.ts"
import type { EdgeAnchor } from "./edge-anchor.ts"
import { getLastGraph } from "./persistence.ts"

export interface DraggingArrow {
  from: EdgeAnchor
  to: EdgeAnchor
}

export interface State {
  camera: ZoomTransform
  tree: DataState

  /** to detect drag targets */
  hovering?: NodeID | EdgeID | null

  /** drag end usually triggers text editing */
  editing?: NodeID | EdgeID

  /** empty object means dragging something without an id */
  dragging?: KeySet<NodeID>

  brush?: BBox

  selected: KeySet<NodeID | EdgeID>

  newArrow?: DraggingArrow
}

/** creates a proxied object that signals changes */
export const [store, setStore] = createStore<State>({
  camera: zoomIdentity,
  tree: emptyDataState(getLastGraph()),
  selected: {},
})
