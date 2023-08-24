import { zoomIdentity, type ZoomTransform } from "d3-zoom"
import { createStore } from "solid-js/store"
import { type DataStore } from "./data"

export interface State {
  camera: ZoomTransform
  data: DataStore
}

export const [store, setStore] = createStore<State>({
  camera: zoomIdentity,
  data: {
    nodes: {},
  },
})
