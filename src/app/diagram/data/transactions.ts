import type { ElkNode } from "elkjs/lib/elk-api"
import type { Vec2 } from "../../../lib/geometry.ts"
import type { KeySet } from "../../../lib/ts.ts"
import { md2html } from "../../markdown.ts"
import { ROOT_ID } from "./ROOT_ID.ts"
import {
  genID,
  isEdgeID,
  isNodeID,
  type EdgeID,
  type Graph,
  type GraphText,
  type Node,
  type NodeID,
  type NodeShape,
} from "./data.ts"
import type { GraphIndex } from "./indexing.ts"
import type { DraggingArrow } from "./state.ts"

export const DEFAULT_SIZE = 100

export function addNode(
  data: Graph,
  [x, y]: Vec2,
  shape: NodeShape = "rect",
): NodeID {
  const id = genID("n")

  data.nodes[id] = {
    id,
    text: { html: "", markdown: "" },
    rect: {
      x: x - DEFAULT_SIZE / 2,
      y: y - DEFAULT_SIZE / 2,
      width: DEFAULT_SIZE,
      height: DEFAULT_SIZE,
    },
    children: [],
    shape,
  }

  data.nodes[ROOT_ID].children.push(id)

  return id
}

export function addEdge(
  data: Graph,
  { from, to }: DraggingArrow,
): EdgeID | NodeID {
  const id: EdgeID = genID("e")
  const text: GraphText = { markdown: "", html: "" }

  if (from.type === "relative") {
    const { x, y } = from
    const nid = addNode(data, [x, y])
    data.edges[id] = {
      id,
      from: { type: "node", id: nid },
      to,
      text,
    }
    return nid
  }

  switch (to.type) {
    case "node":
      data.edges[id] = { id, from, to, text }
      return id

    case "relative": {
      const { x, y } = to
      const nid = addNode(data, [x, y])
      data.edges[id] = {
        id,
        from,
        to: { type: "node", id: nid },
        text,
      }
      return nid
    }
  }
}

export function setMD(
  { nodes, edges }: Graph,
  id: NodeID | EdgeID,
  markdown: string,
): void {
  const text = isNodeID(id) ? nodes[id].text : edges[id].text
  text.markdown = markdown
  text.html = md2html(markdown)
}

function deleteNode(
  { nodes, edges }: Graph,
  { parents, deepChildren }: GraphIndex,
  nid: NodeID,
): void {
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

export function del(
  ne: Graph,
  index: GraphIndex,
  selected: KeySet<NodeID | EdgeID>,
): void {
  for (const id in selected) {
    if (isNodeID(id)) {
      deleteNode(ne, index, id)
    } else if (isEdgeID(id)) {
      delete ne.edges[id]
    }
  }
}

export function ungroup(
  nodes: Record<NodeID, Node>,
  parents: Record<NodeID, NodeID>,
  groupID: NodeID,
): void {
  const group = nodes[groupID]
  const parent = nodes[parents[groupID]]

  const { x, y } = group.rect
  for (const c of group.children) {
    const { rect: childRect } = nodes[c]
    childRect.x += x
    childRect.y += y
  }

  parent.children = parent.children
    .filter(c => c !== groupID)
    .concat(group.children)

  delete nodes[groupID]
}

export function setRect(
  nodes: Record<NodeID, Node>,
  { children, height, width, x, y, id }: ElkNode,
): void {
  const r = nodes[id as NodeID].rect
  r.x = x!
  r.y = y!
  r.width = width!
  r.height = height!

  if (!children) return

  for (const c of children) {
    setRect(nodes, c)
  }
}
