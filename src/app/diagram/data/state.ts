import { zoomIdentity, type ZoomTransform } from "d3-zoom"
import type { BBox } from "rbush"
import { createStore } from "solid-js/store"
import type { KeySet } from "../../../lib/ts.ts"
import {
  emptyGraph,
  type DataState,
  type EdgeID,
  type Graph,
  type GraphID,
  type NodeID,
} from "./data.ts"
import type { EdgeAnchor } from "./edge-anchor.ts"
import { emptyHistory } from "./history.ts"
import { buildIndex } from "./indexing.ts"

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
  return {
    camera: zoomIdentity,
    tree: emptyDataState(emptyGraph()),
    selected: {},
    title: "Untitled 1",
    id: "gdefault",
  }
}

/** creates a proxied object that signals changes */
export const [store, setStore] = createStore(createState())
