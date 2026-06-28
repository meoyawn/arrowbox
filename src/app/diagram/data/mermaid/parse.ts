import type { DiagramDB } from "mermaid/dist/diagram-api/types.js"
import type {
  FlowEdge,
  FlowSubGraph,
  FlowVertex,
} from "mermaid/dist/diagrams/flowchart/types.js"
import { md2html } from "../../../markdown.ts"
import { ROOT_ID } from "../ROOT_ID.ts"
import {
  emptyGraph,
  genID,
  type EdgeID,
  type Graph,
  type NodeID,
} from "../data.ts"

/**
 * Load only Mermaid's flowchart parser chunk to keep paste parsing from
 * bundling the full Mermaid runtime and optional render layouts.
 */
const flowDiagram =
  import("mermaid/dist/chunks/mermaid.core/chunk-PUDLZKDR.mjs").then(
    m => m.diagram,
  )

interface FlowchartDB extends DiagramDB {
  getVertices(): Map<string, FlowVertex>

  getEdges(): FlowEdge[]

  getSubGraphs(): FlowSubGraph[]
}

function calcHierarchy(
  subgraphs: FlowSubGraph[],
): Partial<Record<NodeID, NodeID>> {
  const parents: Partial<Record<NodeID, NodeID>> = {}

  for (const sub of subgraphs) {
    const id: NodeID = `n${sub.id}`
    for (const c of sub.nodes) {
      const cid: NodeID = `n${c}`
      parents[cid] = id
    }
  }

  return parents
}

function fromFlowchartDb(db: FlowchartDB): Graph {
  const vertices = db.getVertices()
  const subgraphs = db.getSubGraphs()
  const edges = db.getEdges()

  const parents = calcHierarchy(subgraphs)

  const g = emptyGraph()
  const root = g.nodes[ROOT_ID]

  for (const sub of subgraphs) {
    const id: NodeID = `n${sub.id}`
    g.nodes[id] = {
      id,
      text: { markdown: sub.title, html: md2html(sub.title) },
      children: sub.nodes.map(c => `n${c}` as const),
      shape: "rect",
      rect: { x: 0, y: 0, width: 1, height: 1 },
    }

    if (!parents[id]) {
      root.children.push(id)
    }
  }

  for (const v of vertices.values()) {
    const id: NodeID = `n${v.id}`
    if (id in g.nodes) continue
    g.nodes[id] = {
      id,
      text: { markdown: v.text ?? v.id, html: md2html(v.text ?? v.id) },
      shape: "rect",
      rect: { x: 0, y: 0, width: 1, height: 1 },
      children: [],
    }

    if (!parents[id]) {
      root.children.push(id)
    }
  }

  for (const edge of edges) {
    const from: NodeID = `n${edge.start}`
    const to: NodeID = `n${edge.end}`

    const id: EdgeID = genID("e")
    g.edges[id] = {
      id,
      from: { id: from, type: "node" },
      to: { id: to, type: "node" },
      text: { markdown: edge.text, html: md2html(edge.text) },
    }
  }

  return g
}

export async function fromMermaid(str: string): Promise<Graph | undefined> {
  try {
    const diagram = await flowDiagram
    const parser = diagram.parser.parser
    if (!parser) throw new Error("No parser found")

    const db = diagram.db as FlowchartDB
    parser.yy = db
    db.clear?.()

    await diagram.parser.parse(`${str}\n`)
    return fromFlowchartDb(db)
  } catch {
    return undefined
  }
}
