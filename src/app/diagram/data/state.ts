import { type ZoomTransform } from "d3-zoom"
import { type Rect, type Vec2 } from "../../../lib/geometry"
import { type EdgeID, type NodeID, type NodesEdges } from "./data"
import { type ImmerHistory } from "./history"
import { type GraphIndex } from "./indexing"

export interface NewArrowState {
  fromWorld: Vec2
  toWorld: Vec2
}

export interface DataState {
  data: NodesEdges
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
