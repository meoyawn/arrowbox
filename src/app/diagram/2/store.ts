import { zoomIdentity, type ZoomTransform } from "d3-zoom"
import { createStore } from "solid-js/store"
import { type Rect } from "../../../lib/geometry"
import { type EdgeID, type NodeID } from "../data/data"
import { emptyDataState, type DataState } from "../data/state"

export interface Store {
  camera: ZoomTransform
  tree: DataState

  /** to detect drag targets */
  hovering?: NodeID | EdgeID

  /** drag end usually triggers text editing */
  editing?: NodeID | EdgeID

  brush?: Rect
}

export const [store, setStore] = createStore<Store>({
  camera: zoomIdentity,
  tree: emptyDataState(),
})
