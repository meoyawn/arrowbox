import { emptyGraph, type Graph, type GraphID } from "./data.ts"

const jsonParse = <T>(s: string): T => JSON.parse(s) as T

export function getStored(g: GraphID): Graph {
  const str = localStorage.getItem(g)
  return str ? jsonParse(str) : emptyGraph()
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
  const str = localStorage.getItem("storedGraphs")
  return str ? jsonParse(str) : {}
}

export function newTitle(gs: StoredGraphs): string {
  const titles = Object.values(gs).map(g => g.title)
  let i = 1
  while (titles.includes(`Untitled ${i}`)) i++
  return `Untitled ${i}`
}

export function storeGraphs(gs: StoredGraphs): void {
  localStorage.setItem("storedGraphs", JSON.stringify(gs))
}
