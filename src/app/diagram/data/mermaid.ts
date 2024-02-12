import type { Diagram } from "mermaid/dist/Diagram"
import type { DiagramDB } from "mermaid/dist/diagram-api/types"
import { memoize } from "../../../lib/ts.ts"
import { md2html } from "../../markdown.ts"
import { emptyGraph, rootID, type Graph, type NodeID } from "./data.ts"

export function toMermaid({ nodes }: Graph, title: string): string {
  return `---
  title: ${title}
  ---
  flowchart LR
   ${Object.values(nodes)
     .map(({ id, text }) => `${id}("${text.markdown}")`)
     .join("\n")}
  `
}

const getMermaid = memoize(() =>
  import("mermaid").then(m => {
    m.default.initialize({ flowchart: {}, startOnLoad: false })
    return m.default
  }),
)

interface MermaidNode {
  id: string
  text: string
  type: "square" | "round"
}

interface MermaidEdge {
  start: string
  end: string
  type: "arrow_point"
  text: string
}

interface MermaidSubgraph {
  id: string
  title: string
  nodes: string[]
}

interface FlowchartDB extends DiagramDB {
  getVertices(): Record<string, MermaidNode>

  getEdges(): MermaidEdge[]

  getSubGraphs(): MermaidSubgraph[]
}

function calcHierarchy(
  subgraphs: MermaidSubgraph[],
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

function fromDiagram(diagram: Diagram): Graph {
  const db = diagram.getParser().parser.yy as FlowchartDB
  const vertices = db.getVertices()
  const subgraphs = db.getSubGraphs()

  const parents = calcHierarchy(subgraphs)

  const g = emptyGraph()
  const root = g.nodes[rootID]

  for (const sub of subgraphs) {
    const id: NodeID = `n${sub.id}`
    g.nodes[id] = {
      id,
      text: { markdown: sub.title, html: md2html(sub.title) },
      children: sub.nodes.map(c => `n${c}` as const),
      shape: "rect",
      rect: { x: 0, y: 0, width: 0, height: 0 },
    }

    if (!parents[id]) {
      root.children.push(id)
    }
  }

  for (const k in vertices) {
    const v = vertices[k]
    const id: NodeID = `n${v.id}`
    g.nodes[id] = {
      id,
      text: { markdown: v.text, html: md2html(v.text) },
      shape: "rect",
      rect: { x: 0, y: 0, width: 0, height: 0 },
      children: [],
    }

    if (!parents[id]) {
      root.children.push(id)
    }
  }

  return g
}

export async function fromMermaid(str: string): Promise<Graph | undefined> {
  try {
    const mermaid = await getMermaid()
    const diagram = await mermaid.mermaidAPI.getDiagramFromText(str)
    return fromDiagram(diagram)
  } catch (e) {
    console.error(e)
    return undefined
  }
}
