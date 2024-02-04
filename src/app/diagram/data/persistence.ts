import {
  emptyDataState,
  emptyDiagram,
  type DataState,
  type GraphID,
  type NodesEdges,
} from "./data.ts"

export function getStored(g: GraphID): DataState {
  const stored = localStorage.getItem(g)
  const data = stored ? (JSON.parse(stored) as NodesEdges) : emptyDiagram()
  return emptyDataState(data)
}

export function store(g: GraphID, data: NodesEdges): void {
  localStorage.setItem(g, JSON.stringify(data))
}
