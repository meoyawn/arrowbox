import ELK, { type ElkLabel, type ElkNode } from "elkjs/lib/elk-api"
import workerUrl from "elkjs/lib/elk-worker.min.js?url"
import { memoize } from "../../../lib/ts.ts"
import { measureHtml } from "../label.tsx"
import {
  rootID,
  type EdgeID,
  type Graph,
  type GraphText,
  type Node,
  type NodeID,
} from "./data.ts"

function toLabels({ html, markdown }: GraphText): ElkLabel[] {
  if (!markdown) return []

  const { width, height } = measureHtml(html)
  return [{ text: markdown, width, height }]
}

function toELK(nodes: Record<NodeID, Node>, id: NodeID): ElkNode {
  const { children, rect, text } = nodes[id]
  const { x, y, width, height } = rect
  return {
    id,
    labels: toLabels(text),
    width,
    height,
    x,
    y,
    children: children.map(cid => toELK(nodes, cid)),
    layoutOptions: {
      "org.eclipse.elk.nodeLabels.placement": "INSIDE H_CENTER V_TOP",
      "org.eclipse.elk.nodeSize.constraints": "PORTS NODE_LABELS MINIMUM_SIZE",
      "org.eclipse.elk.nodeSize.options":
        "ASYMMETRICAL OUTSIDE_NODE_LABELS_OVERHANG",
    },
  }
}

const elk = memoize(() => new ELK({ workerUrl }))

export function layoutGraph({ nodes, edges }: Graph): Promise<ElkNode> {
  const ret = toELK(nodes, rootID)

  ret.edges = []
  for (const eid in edges) {
    const { from, text, to } = edges[eid as EdgeID]
    if (from.type !== "node" || to.type !== "node") continue

    ret.edges.push({
      id: eid,
      sources: [from.id],
      targets: [to.id],
      labels: toLabels(text),
      layoutOptions: { "org.eclipse.elk.edge.type": "DIRECTED" },
    })
  }

  return elk().layout(ret, {
    layoutOptions: {
      "org.eclipse.elk.edgeLabels.inline": "true",
      "org.eclipse.elk.hierarchyHandling": "INCLUDE_CHILDREN",
      // "org.eclipse.elk.layered.crossingMinimization.strategy": "INTERACTIVE",
      // "org.eclipse.elk.layered.interactiveReferencePoint": "TOP_LEFT",
      "org.eclipse.elk.layered.unnecessaryBendpoints": "false",
      // "org.eclipse.elk.spacing.labelLabel": "18",
    },
  })
}
