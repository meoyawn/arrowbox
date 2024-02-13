import { rootID, type Graph, type Node, type NodeID } from "../data.ts"

function print(nodes: Record<NodeID, Node>, id: NodeID): string {
  const { children, text, id } = nodes[id]
  const mermaidID = id.substring(1)
  if (children.length) {
    return (
      `subgraph ${mermaidID}` +
      '("`' +
      text.markdown +
      '`")\n' +
      children.map(cid => print(nodes, cid)).join("\n") +
      "\nend"
    )
  } else {
    return mermaidID + '("`' + text.markdown + '`")'
  }
}

export function toMermaid({ nodes }: Graph, title: string): string {
  return `---
  title: ${title}
  ---
  flowchart LR
   ${nodes[rootID].children.map(cid => print(nodes, cid)).join("\n")}
  `
}
