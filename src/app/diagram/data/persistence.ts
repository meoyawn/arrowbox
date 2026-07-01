import {
  emptyGraph,
  genID,
  type Edge,
  type EdgeID,
  type Graph,
  type GraphID,
  type Node,
  type NodeID,
} from "./data.ts"

const kLastGraph = "last-graph"
const kGraphList = "graph-list"
const kStorageVersion = "storage-version"
const currentStorageVersion = "2"

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined
  return value as Record<string, unknown>
}

function normalizeText(value: unknown): string {
  if (typeof value === "string") return value

  const record = asRecord(value)
  if (typeof record?.markdown === "string") return record.markdown

  return ""
}

function normalizeNode(id: NodeID, value: unknown): Node | undefined {
  const record = asRecord(value)
  if (!record) return undefined

  const storedID = typeof record.id === "string" ? record.id : id
  const rect = asRecord(record.rect)
  const children = Array.isArray(record.children) ? record.children : []

  return {
    id: storedID as NodeID,
    markdown: normalizeText(record.markdown ?? record.text),
    children: children.filter(
      (child): child is NodeID => typeof child === "string",
    ),
    rect: {
      x: typeof rect?.x === "number" ? rect.x : 0,
      y: typeof rect?.y === "number" ? rect.y : 0,
      width: typeof rect?.width === "number" ? rect.width : 0,
      height: typeof rect?.height === "number" ? rect.height : 0,
    },
    shape: record.shape === "ellipse" ? "ellipse" : "rect",
  }
}

function normalizeEdge(id: EdgeID, value: unknown): Edge | undefined {
  const record = asRecord(value)
  if (!record) return undefined

  const from = asRecord(record.from)
  const to = asRecord(record.to)
  if (typeof from?.id !== "string" || typeof to?.id !== "string")
    return undefined

  return {
    id: typeof record.id === "string" ? (record.id as EdgeID) : id,
    from:
      from.type === "relative" &&
      typeof from.x === "number" &&
      typeof from.y === "number"
        ? { type: "relative", id: from.id as NodeID, x: from.x, y: from.y }
        : { type: "node", id: from.id as NodeID },
    to:
      to.type === "relative" &&
      typeof to.x === "number" &&
      typeof to.y === "number"
        ? { type: "relative", id: to.id as NodeID, x: to.x, y: to.y }
        : { type: "node", id: to.id as NodeID },
    markdown: normalizeText(record.markdown ?? record.text),
  }
}

function normalizeGraph(
  value: unknown,
  id: GraphID,
  listTitle?: string,
): Graph | undefined {
  const record = asRecord(value)
  if (!record) return undefined

  const nodesRecord = asRecord(record.nodes)
  const edgesRecord = asRecord(record.edges)
  if (!nodesRecord || !edgesRecord) return undefined

  const nodes: Record<NodeID, Node> = {}
  for (const nodeID in nodesRecord) {
    const node = normalizeNode(nodeID as NodeID, nodesRecord[nodeID])
    if (node) nodes[nodeID as NodeID] = node
  }

  const edges: Record<EdgeID, Edge> = {}
  for (const edgeID in edgesRecord) {
    const edge = normalizeEdge(edgeID as EdgeID, edgesRecord[edgeID])
    if (edge) edges[edgeID as EdgeID] = edge
  }

  return {
    id: typeof record.id === "string" ? (record.id as GraphID) : id,
    title:
      typeof record.title === "string"
        ? record.title
        : (listTitle ?? "Untitled 1"),
    nodes,
    edges,
  }
}

function parseStoredGraphs(): StoredGraphs {
  const str = localStorage.getItem(kGraphList)
  return str ? (JSON.parse(str) as StoredGraphs) : {}
}

function migrateGraph(id: GraphID, listTitle?: string): void {
  const str = localStorage.getItem(id)
  if (!str) return

  const graph = normalizeGraph(JSON.parse(str), id, listTitle)
  if (graph) localStorage.setItem(id, graphJSON(graph))
}

function migrateStorageV1ToV2(): string {
  const gs = parseStoredGraphs()
  for (const id in gs) migrateGraph(id as GraphID, gs[id as GraphID]?.title)

  const lastID = localStorage.getItem(kLastGraph)
  if (lastID) migrateGraph(lastID as GraphID, gs[lastID as GraphID]?.title)

  localStorage.setItem(kStorageVersion, "2")
  return "2"
}

export function ensureStorageMigrations(): void {
  let version = localStorage.getItem(kStorageVersion) ?? "1"

  while (version !== currentStorageVersion) {
    switch (version) {
      case "1":
        version = migrateStorageV1ToV2()
        break

      default:
        throw new Error(`Unsupported storage version ${version}`)
    }
  }
}

export function getStoredGraphs(): StoredGraphs {
  ensureStorageMigrations()
  return parseStoredGraphs()
}

function storeGraphs(gs: StoredGraphs): void {
  localStorage.setItem(kGraphList, JSON.stringify(gs))
}

function readGraph(id: GraphID): Graph | undefined {
  ensureStorageMigrations()
  const str = localStorage.getItem(id)
  if (!str) return undefined

  const listTitle = getStoredGraphs()[id]?.title
  return normalizeGraph(JSON.parse(str), id, listTitle)
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
            markdown: node.markdown,
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
            markdown: edge.markdown,
          },
        ]
      }),
    ),
  })
}

export function storeGraph(id: GraphID, data: Graph): void {
  ensureStorageMigrations()
  const graph = { ...data, id }
  localStorage.setItem(id, graphJSON(graph))

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
  ensureStorageMigrations()
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
  ensureStorageMigrations()
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
  ensureStorageMigrations()
  const str = localStorage.getItem(id)
  if (str) {
    const graph = normalizeGraph(JSON.parse(str), id, title)
    if (graph) localStorage.setItem(id, graphJSON({ ...graph, title }))
  }

  const gs = getStoredGraphs()
  gs[id] = { ...gs[id], title, lastModifiedMs: gs[id]?.lastModifiedMs ?? 0 }
  storeGraphs(gs)
}

export function archive(id: GraphID): void {
  ensureStorageMigrations()
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
