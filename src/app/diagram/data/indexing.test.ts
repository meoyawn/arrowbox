import { describe, expect, test } from "vitest"
import { genID, rootID, type Node, type NodeID } from "./data.ts"
import { traverse } from "./indexing"

const genNode = (children: NodeID[]): Node => ({
  id: genID("n"),
  children,
  rect: { x: 0, y: 0, width: 0, height: 0 },
  text: { html: "", markdown: "" },
  shape: "rect",
})

const genNodes = (ns: Node[], children: NodeID[]): Record<NodeID, Node> => {
  const ret: Record<NodeID, Node> = { [rootID]: genNode(children) }
  for (const node of ns) {
    ret[node.id] = node
  }
  return ret
}

describe("traverse", () => {
  test("should return an empty array when nodes is empty", () => {
    expect(traverse(genNodes([], []))).toEqual([[rootID, []]])
  })

  test("should return an array with one element when nodes has one node", () => {
    const n = genNode([])
    expect(traverse(genNodes([n], [n.id]))).toEqual([
      [rootID, []],
      [n.id, [0]],
    ])
  })

  test("should return an array with all nodes when nodes has multiple nodes with no children", () => {
    const n1 = genNode([])
    const n2 = genNode([])
    expect(traverse(genNodes([n1, n2], [n1.id, n2.id]))).toEqual([
      [rootID, []],
      [n1.id, [0]],
      [n2.id, [1]],
    ])
  })

  test("should return an array with all nodes and their paths when nodes has multiple nodes with children", () => {
    const n2 = genNode([])
    const n1 = genNode([n2.id])
    expect(traverse(genNodes([n1, n2], [n1.id]))).toEqual([
      [rootID, []],
      [n1.id, [0]],
      [n2.id, [0, 0]],
    ])
  })
})
