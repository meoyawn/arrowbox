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

function readGraph(id: GraphID): Graph | undefined {
  const str = localStorage.getItem(id)
  if (!str) return undefined

  const listTitle = getStoredGraphs()[id]?.title
  const graph = JSON.parse(str) as Graph
  return { ...graph, id: graph.id ?? id, title: graph.title ?? listTitle }
}

function graphJSON({ edges, id, nodes, title }: Graph): string {
  return JSON.stringify({
    id,
    title,
    nodes: Object.fromEntries(
      (Object.keys(nodes) as Array<keyof typeof nodes>).sort().map(id => {
        const node = nodes[id]
        return [
          id,
          {
            id: node.id,
            children: node.children,
            rect: node.rect,
            text: {
              markdown: node.text.markdown,
              html: node.text.html,
            },
            shape: node.shape,
          },
        ]
      }),
    ),
    edges: Object.fromEntries(
      (Object.keys(edges) as Array<keyof typeof edges>).sort().map(id => {
        const edge = edges[id]
        return [
          id,
          {
            id: edge.id,
            from: edge.from,
            to: edge.to,
            text: {
              markdown: edge.text.markdown,
              html: edge.text.html,
            },
          },
        ]
      }),
    ),
  })
}

export function storeGraph(id: GraphID, data: Graph): void {
  const graph = { ...data, id }
  localStorage.setItem(id, JSON.stringify(graph))

  const gs = getStoredGraphs()
  gs[id] = { ...gs[id], title: graph.title, lastModifiedMs: Date.now() }
  storeGraphs(gs)
}

interface CreateNewGraphOptions {
  title?: string
}

export function createNewGraph(
  graph: Graph = emptyGraph(),
  options: CreateNewGraphOptions = {},
): {
  graph: Graph
  id: GraphID
} {
  const id = graph.id || genID("g")
  const title = options.title ?? newTitle(getStoredGraphs())
  const graphWithTitle = { ...graph, id, title }
  storeGraph(id, graphWithTitle)
  setLastGraph(id)
  return { graph: graphWithTitle, id }
}

export function getLastGraph(): { graph: Graph; id: GraphID } {
  const lastID = localStorage.getItem(kLastGraph) as GraphID
  if (!lastID) return createNewGraph()

  const graph = readGraph(lastID)
  if (graph) return { graph, id: lastID }

  throw new Error(`No graph found for ID ${lastID}`)
}

export function importSharedGraph(graph: Graph): { graph: Graph; id: GraphID } {
  const stored = readGraph(graph.id)
  if (!stored) {
    storeGraph(graph.id, graph)
    setLastGraph(graph.id)
    return { graph, id: graph.id }
  }

  if (graphJSON(stored) === graphJSON(graph)) {
    setLastGraph(graph.id)
    return { graph: stored, id: graph.id }
  }

  return createNewGraph({ ...graph, id: genID("g") }, { title: graph.title })
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
  const str = localStorage.getItem(id)
  if (str) {
    const graph = JSON.parse(str) as Graph
    localStorage.setItem(id, JSON.stringify({ ...graph, id, title }))
  }

  const gs = getStoredGraphs()
  gs[id] = { ...gs[id], title, lastModifiedMs: gs[id]?.lastModifiedMs ?? 0 }
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
