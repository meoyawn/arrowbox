import {
  type Edge,
  type Graph,
  type GraphText,
  type Node,
  type NodeID,
} from "../data.ts"
import { ROOT_ID } from "../ROOT_ID.ts"

const mdLabel = (text: GraphText): `"\`${string}\`"` | `" "` =>
  text.markdown ? `"\`${text.markdown}\`"` : `" "`

const mermaidID = (id: NodeID): string => id.substring(1)

function idLabel({ shape, text, id, children }: Node): string {
  const mID = mermaidID(id)
  if (text.markdown === mID) return mID

  const lbl = mdLabel(text)
  if (children.length) return `${mID}[${lbl}]`

  switch (shape) {
    case "rect":
      return `${mID}(${lbl})`

    case "ellipse":
      return `${mID}((${lbl}))`
  }
}

const spaces = (indent: number): string => " ".repeat(indent)

function printN(
  nodes: Record<NodeID, Node>,
  id: NodeID,
  indent: number,
): string {
  const n = nodes[id]
  return n.children.length
    ? `subgraph ${idLabel(n)}\n${body(nodes, id, indent + 2)}\n${spaces(indent)}end`
    : idLabel(n)
}

const body = (
  nodes: Record<NodeID, Node>,
  id: NodeID,
  indent: number,
): string =>
  spaces(indent) +
  nodes[id].children
    .map(cid => printN(nodes, cid, indent))
    .join("\n" + spaces(indent))

function printE({ from, to, text }: Edge): string {
  const f = mermaidID(from.id)
  const t = mermaidID(to.id)
  return text.markdown ? `${f} -- ${mdLabel(text)} --> ${t}` : `${f} --> ${t}`
}

function frontMatter(title: string): `---\ntitle: ${string}\n---` | "" {
  if (!title || title.toLowerCase().includes("untitled")) return ""

  return `---
title: ${title}
---`
}

export const toMermaid = ({ nodes, edges }: Graph, title: string): string =>
  `${frontMatter(title)}
flowchart
${body(nodes, ROOT_ID, 0)}
${Object.values(edges).map(printE).join("\n")}
`
