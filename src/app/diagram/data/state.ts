import { zoomIdentity, type ZoomTransform } from "d3-zoom"
import { createStore } from "solid-js/store"
import { type Rect, type Vec2 } from "../../../lib/geometry"
import { rootID, type EdgeID, type NodeID, type TheDiagram } from "./data"
import { buildIndex, type GraphIndex } from "./graphIndex"
import { emptyHistory, type ImmerHistory } from "./history"

export interface NewArrowState {
  fromWorld: Vec2
  toWorld: Vec2
}

export interface DataState {
  data: TheDiagram
  history: ImmerHistory
  index: GraphIndex
}

export interface State {
  camera: ZoomTransform
  data: DataState

  selected: Record<NodeID | EdgeID, true>

  brush?: Rect
  newArrow?: NewArrowState

  hovering?: NodeID | EdgeID
  dragging?: NodeID | EdgeID
  editing?: NodeID | EdgeID
}

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

export const [store, setStore] = createStore<State>({
  camera: zoomIdentity,
  data: {
    data: emptyDiagram(),
    history: emptyHistory(),
    index: buildIndex(emptyDiagram()),
  },
  selected: {},
})
