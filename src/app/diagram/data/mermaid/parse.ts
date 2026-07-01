import type { Diagram } from "mermaid/dist/Diagram.js"
import type { DiagramDB } from "mermaid/dist/diagram-api/types.js"
import type {
  FlowEdge,
  FlowSubGraph,
  FlowVertex,
} from "mermaid/dist/diagrams/flowchart/types.js"
import { Config } from "../../../config.ts"
import { sleep } from "../../../../lib/ts.ts"
import { ROOT_ID } from "../ROOT_ID.ts"
import {
  emptyGraph,
  genID,
  type EdgeID,
  type Graph,
  type NodeID,
} from "../data.ts"

const mermaidModule = sleep(Config.heavyScriptDelayMs)
  .then(() => import("mermaid"))
  .then(m => {
    m.default.initialize({ flowchart: {}, startOnLoad: false })
    return m.default.mermaidAPI
  })

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
      markdown: sub.title,
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
      markdown: v.text ?? v.id,
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
      markdown: edge.text,
    }
  }

  return g
}

function fromDiagram(diagram: Diagram): Graph {
  const parser = diagram.getParser().parser
  if (!parser) throw new Error("No parser found")

  return fromFlowchartDb(parser.yy as FlowchartDB)
}

export async function fromMermaid(str: string): Promise<Graph | undefined> {
  const mermaid = await mermaidModule
  try {
    const diagram = await mermaid.getDiagramFromText(str)
    return fromDiagram(diagram)
  } catch {
    return undefined
  }
}
