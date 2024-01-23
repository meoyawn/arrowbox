import { type Vec2 } from "../../../lib/geometry.ts"
import type { RSet } from "../../../lib/ts.ts"
import { md2html } from "../../markdown.ts"
import { measureHtml } from "../label.tsx"
import {
  genID,
  isEdgeID,
  isNodeID,
  rootID,
  type EdgeID,
  type NodeID,
  type NodesEdges,
} from "./data.ts"
import type { GraphIndex } from "./indexing.ts"

export const addNode = (data: NodesEdges, [x, y]: Vec2): NodeID => {
  const id = genID("n")

  data.nodes[id] = {
    id,
    text: {
      html: "",
      markdown: "",
      htmlWidth: 0,
      htmlHeight: 0,
    },
    rect: { x, y, width: 100, height: 100 },
    children: [],
  }

  data.nodes[rootID].children.push(id)

  return id
}

export const addEdge = (
  data: NodesEdges,
  { from, to, world }: { from: NodeID; to?: NodeID; world: Vec2 },
): EdgeID | NodeID => {
  if (!to && !from) throw new Error("must specify from or to")

  const id: EdgeID = genID("e")
  const toID: NodeID = to ?? addNode(data, world)
  data.edges[id] = {
    id,
    from: { type: "node", id: from },
    to: { type: "node", id: toID },
  }

  return to ? id : toID
}

export const setMD2 = (
  data: NodesEdges,
  id: NodeID,
  markdown: string,
): void => {
  const html = md2html(markdown)
  const { width, height } = measureHtml(html)

  const { text, rect } = data.nodes[id]
  text.markdown = markdown
  text.html = html
  if (rect.width < width) {
    rect.width = width
  }
  if (rect.height < height) {
    rect.height = height
  }
}

const deleteNode = (
  { nodes, edges }: NodesEdges,
  { parents, deepChildren }: GraphIndex,
  nid: NodeID,
): void => {
  const parent = nodes[parents[nid]]
  parent.children = parent.children.filter(x => x !== nid)

  const dc = deepChildren[nid]
  for (const c in dc) {
    delete nodes[c as NodeID]
  }
  delete nodes[nid]

  for (const eid in edges) {
    const { from, to } = edges[eid as EdgeID]
    if (from.id === nid || to.id === nid || from.id in dc || to.id in dc) {
      delete edges[eid as EdgeID]
    }
  }
}

export const del = (
  ne: NodesEdges,
  index: GraphIndex,
  selected: RSet<NodeID | EdgeID>,
): void => {
  for (const id in selected) {
    if (isNodeID(id)) {
      deleteNode(ne, index, id)
    } else if (isEdgeID(id)) {
      delete ne.edges[id]
    }
  }
}
