import type { ElkLabel, ElkNode } from "elkjs/lib/elk-api"
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

const getELK = memoize(() =>
  import("elkjs/lib/elk.bundled").then(x => new x.default({})),
)

function toLabels({ html, markdown }: GraphText): ElkLabel[] {
  if (!markdown) return []

  const { width, height } = measureHtml(html)
  return [{ text: markdown, width, height }]
}

/** DFS */
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
  }
}

export async function layoutGraph({ nodes, edges }: Graph): Promise<ElkNode> {
  const root = toELK(nodes, rootID)

  root.edges = []
  for (const eid in edges) {
    const { from, text, to } = edges[eid as EdgeID]
    if (from.type !== "node" || to.type !== "node") continue

    root.edges.push({
      id: eid,
      sources: [from.id],
      targets: [to.id],
      labels: toLabels(text),
    })
  }

  const elk = await getELK()
  return elk.layout(root, {
    layoutOptions: {
      "org.eclipse.elk.edge.type": "DIRECTED",
      "org.eclipse.elk.edgeLabels.inline": "true",
      "org.eclipse.elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "org.eclipse.elk.layered.unnecessaryBendpoints": "false",
      "org.eclipse.elk.nodeLabels.placement": "INSIDE H_CENTER V_TOP",
      "org.eclipse.elk.nodeSize.constraints": "PORTS NODE_LABELS MINIMUM_SIZE",
      // "org.eclipse.elk.layered.crossingMinimization.strategy": "INTERACTIVE",
      // "org.eclipse.elk.layered.interactiveReferencePoint": "TOP_LEFT",
      "org.eclipse.elk.nodeSize.options":
        "ASYMMETRICAL OUTSIDE_NODE_LABELS_OVERHANG",
      // "org.eclipse.elk.spacing.labelLabel": "18",
    },
  })
}
