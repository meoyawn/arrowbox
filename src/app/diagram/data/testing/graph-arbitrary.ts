import fc from "fast-check"
import { ROOT_ID } from "../ROOT_ID.ts"
import type { Edge, EdgeID, Graph, GraphID, Node, NodeID } from "../data.ts"

const markdownChars = [
  "a",
  "b",
  "c",
  "0",
  "1",
  " ",
  '"',
  "'",
  "`",
  "/",
  ":",
  "_",
  "-",
  ">",
  "<",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
  "\n",
  "*",
] as const

const idChars = ["a", "b", "c", "d", "e", "f", "0", "1", "2", "3"] as const

const graphIDArbitrary = fc
  .array(fc.constantFrom(...idChars), { minLength: 1, maxLength: 16 })
  .map((chars): GraphID => `g${chars.join("")}`)

export const graphTextArbitrary = fc
  .array(fc.constantFrom(...markdownChars), {
    minLength: 0,
    maxLength: 40,
  })
  .map(chars => chars.join(""))

export const graphArbitrary = fc.integer({ min: 1, max: 6 }).chain(nodeCount =>
  fc
    .record({
      edgeSpecs: fc.array(
        fc.record({
          fromRaw: fc.nat(),
          markdown: graphTextArbitrary,
          toRaw: fc.nat(),
        }),
        { minLength: 0, maxLength: Math.min(8, nodeCount * nodeCount) },
      ),
      nodeTexts: fc.array(graphTextArbitrary, {
        minLength: nodeCount,
        maxLength: nodeCount,
      }),
      parentRaws: fc.array(fc.nat(), {
        minLength: nodeCount,
        maxLength: nodeCount,
      }),
      shapes: fc.array(fc.constantFrom("rect", "ellipse"), {
        minLength: nodeCount,
        maxLength: nodeCount,
      }),
      graphID: graphIDArbitrary,
      title: graphTextArbitrary,
    })
    .map(
      ({ edgeSpecs, graphID, nodeTexts, parentRaws, shapes, title }): Graph => {
        function nodeID(index: number): NodeID {
          return `nnode${index}`
        }

        function edgeID(index: number): EdgeID {
          return `eedge${index}`
        }

        const nodes: Record<NodeID, Node> = {
          [ROOT_ID]: {
            id: ROOT_ID,
            markdown: "",
            rect: { x: 0, y: 0, width: 0, height: 0 },
            children: [],
            shape: "rect",
          },
        }

        for (const [index, markdown] of nodeTexts.entries()) {
          const id = nodeID(index)
          nodes[id] = {
            id,
            markdown,
            rect: { x: 0, y: 0, width: 0, height: 0 },
            children: [],
            shape: shapes[index] ?? "rect",
          }
        }

        for (const [index, rawParent] of parentRaws.entries()) {
          const parentIndex = (rawParent % (index + 1)) - 1
          const parent = parentIndex < 0 ? ROOT_ID : nodeID(parentIndex)
          nodes[parent].children.push(nodeID(index))
        }

        const edges: Record<EdgeID, Edge> = {}
        for (const [index, spec] of edgeSpecs.entries()) {
          const id = edgeID(index)
          edges[id] = {
            id,
            from: { id: nodeID(spec.fromRaw % nodeCount), type: "node" },
            to: { id: nodeID(spec.toRaw % nodeCount), type: "node" },
            markdown: spec.markdown,
          }
        }

        return { id: graphID, title, nodes, edges }
      },
    ),
)
