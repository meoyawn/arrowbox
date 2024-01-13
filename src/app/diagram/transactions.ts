import { type Vec2 } from "../../lib/geometry.ts"
import { md2html } from "../markdown.ts"
import {
  genID,
  rootID,
  type EdgeID,
  type NodeID,
  type NodesEdges,
} from "./data/data.ts"
import { measureHtml } from "./label.tsx"

export function addNode2(data: NodesEdges, [x, y]: Vec2): NodeID {
  const id = genID("n")

  data.nodes[id] = {
    id,
    text: {
      html: "",
      markdown: "",
    },
    rect: { x, y, width: 100, height: 100 },
    children: [],
  }

  data.nodes[rootID].children.push(id)

  return id
}

export function addEdge2(
  data: NodesEdges,
  { from, to, world }: { from: NodeID; to?: NodeID; world: Vec2 },
): EdgeID | NodeID {
  if (!to && !from) throw new Error("must specify from or to")

  const id: EdgeID = genID("e")
  const toID: NodeID = to ?? addNode2(data, world)
  data.edges[id] = {
    id,
    from: { type: "node", id: from },
    to: { type: "node", id: toID },
  }

  return to ? id : toID
}

export function setMD2(data: NodesEdges, id: NodeID, markdown: string): void {
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
