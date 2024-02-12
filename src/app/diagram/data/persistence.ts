import { emptyGraph, genID, type Graph, type GraphID } from "./data.ts"

const kLastGraph = "last-graph"
const kGraphList = "graph-list"

export function getStoredGraphs(): StoredGraphs {
  const str = localStorage.getItem(kGraphList)
  return str ? (JSON.parse(str) as StoredGraphs) : {}
}

function storeGraphs(gs: StoredGraphs): void {
  localStorage.setItem(kGraphList, JSON.stringify(gs))
}

export function storeGraph(id: GraphID, data: Graph): void {
  localStorage.setItem(id, JSON.stringify(data))

  const gs = getStoredGraphs()
  gs[id] = { ...gs[id], lastModifiedMs: Date.now() }
  storeGraphs(gs)
}

function addToList(id: GraphID): string {
  const gs = getStoredGraphs()
  const title = newTitle(gs)
  gs[id] = {
    title,
    lastModifiedMs: Date.now(),
  }
  storeGraphs(gs)
  return title
}

export function createNewGraph(graph: Graph = emptyGraph()): {
  graph: Graph
  id: GraphID
  title: string
} {
  const id = genID("g")
  storeGraph(id, graph)
  const title = addToList(id)
  setLastGraph(id)
  return { graph, id, title }
}

export function getLastGraph(): { graph: Graph; id: GraphID; title: string } {
  const lastID = localStorage.getItem(kLastGraph) as GraphID
  if (!lastID) return createNewGraph()

  const str = localStorage.getItem(lastID)
  if (str) {
    return {
      graph: JSON.parse(str) as Graph,
      id: lastID,
      title: getStoredGraphs()[lastID].title,
    }
  }

  throw new Error(`No graph found for ID ${lastID}`)
}

export function setLastGraph(id: GraphID | null): void {
  if (id) {
    localStorage.setItem(kLastGraph, id)
  } else {
    localStorage.removeItem(kLastGraph)
  }
}

interface StoredGraph {
  title: string
  lastModifiedMs: number
  archived?: boolean
}

export function saveTitle(id: GraphID, title: string): void {
  const gs = getStoredGraphs()
  gs[id].title = title
  storeGraphs(gs)
}

export function archive(id: GraphID): void {
  const gs = getStoredGraphs()
  gs[id].archived = true
  storeGraphs(gs)

  setLastGraph(null)
}

export type StoredGraphs = Record<GraphID, StoredGraph>

/** visible for testing */
export function newTitle(gs: StoredGraphs): string {
  const titles = Object.values(gs).map(g => g.title)
  let i = 1
  while (titles.includes(`Untitled ${i}`)) i++
  return `Untitled ${i}`
}

export function dumpStorage(): string {
  const len = localStorage.length
  const ret: Record<string, unknown> = {}

  for (let i = 0; i < len; i++) {
    const k = localStorage.key(i)
    if (!k) continue

    const v = localStorage.getItem(k)
    if (!v) continue

    try {
      ret[k] = JSON.parse(v)
    } catch (e) {
      ret[k] = v
    }
  }

  return JSON.stringify(ret)
}

export function loadStorage(s: string): void {
  const data = JSON.parse(s) as Record<string, unknown>
  for (const k in data) {
    localStorage.setItem(k, JSON.stringify(data[k]))
  }
}
