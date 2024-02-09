import { emptyGraph, genID, type Graph, type GraphID } from "./data.ts"

const jsonParse = <T>(s: string): T => JSON.parse(s) as T

const kLastGraph = "last-graph"
const kGraphList = "graph-list"

export function getLastGraph(): Graph {
  const lastID = localStorage.getItem(kLastGraph)
  if (!lastID) {
    const id = genID("g")
    const g = emptyGraph(id)
    storeGraph(g)
    addGraph(id)
    setLastGraph(id)
    return g
  }

  const str = localStorage.getItem(lastID)
  if (str) {
    return jsonParse(str)
  }

  throw new Error(`No graph found for ID ${lastID}`)
}

export function setLastGraph(id: GraphID): void {
  localStorage.setItem(kLastGraph, id)
}

export function storeGraph(data: Graph): void {
  localStorage.setItem(data.id, JSON.stringify(data))

  const gs = getStoredGraphs()
  gs[data.id] = { ...gs[data.id], lastModifiedMs: Date.now() }
  storeGraphs(gs)
}

interface StoredGraph {
  title: string
  lastModifiedMs: number
}

export type StoredGraphs = Record<GraphID, StoredGraph>

export function getStoredGraphs(): StoredGraphs {
  const str = localStorage.getItem(kGraphList)
  return str ? jsonParse(str) : {}
}

function storeGraphs(gs: StoredGraphs): void {
  localStorage.setItem(kGraphList, JSON.stringify(gs))
}

export function newTitle(gs: StoredGraphs): string {
  const titles = Object.values(gs).map(g => g.title)
  let i = 1
  while (titles.includes(`Untitled ${i}`)) i++
  return `Untitled ${i}`
}

function addGraph(id: GraphID) {
  const gs = getStoredGraphs()
  gs[id] = {
    title: newTitle(gs),
    lastModifiedMs: Date.now(),
  }
  storeGraphs(gs)
}

export function createNewGraph(): GraphID {
  const id = genID("g")
  storeGraph(emptyGraph(id))
  addGraph(id)
  return id
}
