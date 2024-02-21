import { zoomIdentity, type ZoomTransform } from "d3-zoom"
import type { BBox } from "rbush"
import { createStore } from "solid-js/store"
import type { KeySet } from "../../../lib/ts.ts"
import type { DataState, EdgeID, Graph, GraphID, NodeID } from "./data.ts"
import type { EdgeAnchor } from "./edge-anchor.ts"
import { emptyHistory } from "./history.ts"
import { buildIndex } from "./indexing.ts"
import { getLastGraph } from "./persistence.ts"

export interface DraggingArrow {
  from: EdgeAnchor
  to: EdgeAnchor
}

export interface State {
  id: GraphID
  title: string

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

export const emptyDataState = (data: Graph): DataState => ({
  data,
  index: buildIndex(data),
  history: emptyHistory(),
})

function createState(): State {
  const { graph, title, id } = getLastGraph()

  return {
    camera: zoomIdentity,
    tree: emptyDataState(graph),
    selected: {},
    title,
    id,
  }
}

/** creates a proxied object that signals changes */
export const [store, setStore] = createStore(createState())
