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

export function storeGraph(data: Graph): void {
  localStorage.setItem(data.id, JSON.stringify(data))

  const gs = getStoredGraphs()
  gs[data.id] = { ...gs[data.id], lastModifiedMs: Date.now() }
  storeGraphs(gs)
}

function addToList(id: GraphID) {
  const gs = getStoredGraphs()
  gs[id] = {
    title: newTitle(gs),
    lastModifiedMs: Date.now(),
  }
  storeGraphs(gs)
}

export function createNewGraph(): Graph {
  const id = genID("g")
  const g = emptyGraph(id)
  storeGraph(g)
  addToList(id)
  setLastGraph(id)
  return g
}

export function getLastGraph(): Graph {
  const lastID = localStorage.getItem(kLastGraph)
  if (!lastID) return createNewGraph()

  const str = localStorage.getItem(lastID)
  if (str) {
    return JSON.parse(str) as Graph
  }

  throw new Error(`No graph found for ID ${lastID}`)
}

export function setLastGraph(id: GraphID): void {
  localStorage.setItem(kLastGraph, id)
}

interface StoredGraph {
  title: string
  lastModifiedMs: number
  archived?: boolean
}

export type StoredGraphs = Record<GraphID, StoredGraph>

/** visible for testing */
export function newTitle(gs: StoredGraphs): string {
  const titles = Object.values(gs).map(g => g.title)
  let i = 1
  while (titles.includes(`Untitled ${i}`)) i++
  return `Untitled ${i}`
}

function dumpStorage(): string {
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

function loadStorage(s: string): void {
  const data = JSON.parse(s) as Record<string, unknown>
  for (const k in data) {
    localStorage.setItem(k, JSON.stringify(data[k]))
  }
}
