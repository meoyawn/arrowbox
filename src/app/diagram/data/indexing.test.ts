import { describe, expect, test } from "bun:test"
import { genID, type Node, type NodeID } from "./data.ts"
import { traverse } from "./indexing.ts"
import { ROOT_ID } from "./ROOT_ID.ts"

const genNode = (children: NodeID[]): Node => ({
  id: genID("n"),
  children,
  rect: { x: 0, y: 0, width: 0, height: 0 },
  text: { html: "", markdown: "" },
  shape: "rect",
})

const genNodes = (ns: Node[], children: NodeID[]): Record<NodeID, Node> => {
  const ret: Record<NodeID, Node> = { [ROOT_ID]: genNode(children) }
  for (const node of ns) {
    ret[node.id] = node
  }
  return ret
}

describe.concurrent("traverse", () => {
  test("should return an empty array when nodes is empty", () => {
    expect(traverse(genNodes([], []))).toEqual([[ROOT_ID, []]])
  })

  test("should return an array with one element when nodes has one node", () => {
    const n = genNode([])
    expect(traverse(genNodes([n], [n.id]))).toEqual([
      [ROOT_ID, []],
      [n.id, [0]],
    ])
  })

  test("should return an array with all nodes when nodes has multiple nodes with no children", () => {
    const n1 = genNode([])
    const n2 = genNode([])
    expect(traverse(genNodes([n1, n2], [n1.id, n2.id]))).toEqual([
      [ROOT_ID, []],
      [n1.id, [0]],
      [n2.id, [1]],
    ])
  })

  test("should return an array with all nodes and their paths when nodes has multiple nodes with children", () => {
    const n2 = genNode([])
    const n1 = genNode([n2.id])
    expect(traverse(genNodes([n1, n2], [n1.id]))).toEqual([
      [ROOT_ID, []],
      [n1.id, [0]],
      [n2.id, [0, 0]],
    ])
  })
})
