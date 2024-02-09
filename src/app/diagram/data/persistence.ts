import { emptyGraph, genID, type Graph, type GraphID } from "./data.ts"

const jsonParse = <T>(s: string): T => JSON.parse(s) as T

const kLastGraph = "last-graph"
const kGraphList = "graph-list"

export function getLastGraph(): Graph {
  const lastID = localStorage.getItem(kLastGraph)
  if (!lastID) {
    const id = genID("g")
    const g = emptyGraph()
    storeGraph(id, g)
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

export function storeGraph(g: GraphID, data: Graph): void {
  localStorage.setItem(g, JSON.stringify(data))
  // TODO update lastModifiedMs
}

interface StoredGraph {
  title: string
  lastModifiedMs: number
}

type StoredGraphs = Record<GraphID, StoredGraph>

export function getStoredGraphs(): StoredGraphs {
  const str = localStorage.getItem(kLastGraph)
  return str ? jsonParse(str) : {}
}

export function newTitle(gs: StoredGraphs): string {
  const titles = Object.values(gs).map(g => g.title)
  let i = 1
  while (titles.includes(`Untitled ${i}`)) i++
  return `Untitled ${i}`
}

export function storeGraphs(gs: StoredGraphs): void {
  localStorage.setItem(kGraphList, JSON.stringify(gs))
}

function addGraph(id: GraphID) {
  const gs = getStoredGraphs()
  gs[id] = {
    title: newTitle(gs),
    lastModifiedMs: Date.now(),
  }
  storeGraphs(gs)
}
