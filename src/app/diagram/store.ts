import { zoomIdentity, type ZoomTransform } from "d3-zoom"
import { type BBox } from "rbush"
import { createStore } from "solid-js/store"
import { type Vec2 } from "../../lib/geometry.ts"
import { type RSet } from "../../lib/ts.ts"
import { emptyDataState, type EdgeID, type NodeID } from "./data/data.ts"
import { type DataState } from "./data/state.ts"

export interface Store {
  camera: ZoomTransform
  tree: DataState

  /** to detect drag targets */
  hovering?: NodeID | EdgeID

  /** drag end usually triggers text editing */
  editing?: NodeID | EdgeID

  dragging: RSet<NodeID>

  brush?: BBox

  selected: RSet<NodeID | EdgeID>

  newArrow?: {
    from: NodeID
    to: Vec2
  }
}

export const [store, setStore] = createStore<Store>({
  camera: zoomIdentity,
  tree: emptyDataState(),
  selected: {},
  dragging: {},
})
