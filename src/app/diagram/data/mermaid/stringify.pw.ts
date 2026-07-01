import { expect, test, type Page } from "@playwright/test"
import fc from "fast-check"
import { ROOT_ID } from "../ROOT_ID.ts"
import type { Edge, EdgeID, Graph, GraphText, Node, NodeID } from "../data.ts"

async function loadHarness(page: Page): Promise<void> {
  await page.goto("/")
  await page.setContent("<main></main>")
  await page.addScriptTag({
    type: "module",
    url: "/src/app/playwright-harness.ts",
  })
}

test.describe("stringify mermaid", () => {
  test("output parses when markdown contains double quotes", async ({
    page,
  }) => {
    await loadHarness(page)

    const graph: Graph = {
      nodes: {
        [ROOT_ID]: {
          id: ROOT_ID,
          text: { html: "", markdown: "" },
          rect: { x: 0, y: 0, width: 0, height: 0 },
          children: ["nsource", "ntarget"],
          shape: "rect",
        },
        nsource: {
          id: "nsource",
          text: {
            html: "",
            markdown: 'GET "/encode/:photo_key": `photo_key` -> `[80]f32`',
          },
          rect: { x: 0, y: 0, width: 0, height: 0 },
          children: [],
          shape: "rect",
        },
        ntarget: {
          id: "ntarget",
          text: { html: "", markdown: "Elastic" },
          rect: { x: 0, y: 0, width: 0, height: 0 },
          children: [],
          shape: "rect",
        },
      },
      edges: {
        equery: {
          id: "equery",
          from: { id: "nsource", type: "node" },
          to: { id: "ntarget", type: "node" },
          text: { html: "", markdown: 'query "vec"' },
        },
      },
    }

    const result = await page.evaluate(async graph => {
      const mermaid = window.arrowboxPw.toMermaid(graph, "Untitled")
      return {
        mermaid,
        parsed: (await window.arrowboxPw.fromMermaid(mermaid)) !== undefined,
      }
    }, graph)

    expect(result.mermaid).toContain("#quot;/encode/:photo_key#quot;")
    expect(result.mermaid).toContain("query #quot;vec#quot;")
    expect(result.parsed).toEqual(true)
  })

  test("generated graphs stringify to parseable mermaid", async ({ page }) => {
    test.setTimeout(60_000)
    await loadHarness(page)

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
    const graphTextArbitrary = fc
      .array(fc.constantFrom(...markdownChars), {
        minLength: 0,
        maxLength: 40,
      })
      .map((chars): GraphText => ({ html: "", markdown: chars.join("") }))
    const graphArbitrary = fc.integer({ min: 1, max: 6 }).chain(nodeCount =>
      fc
        .record({
          edgeSpecs: fc.array(
            fc.record({
              fromRaw: fc.nat(),
              text: graphTextArbitrary,
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
        })
        .map(({ edgeSpecs, nodeTexts, parentRaws, shapes }): Graph => {
          function nodeID(index: number): NodeID {
            return `nnode${index}` as NodeID
          }

          function edgeID(index: number): EdgeID {
            return `eedge${index}` as EdgeID
          }

          const nodes: Record<NodeID, Node> = {
            [ROOT_ID]: {
              id: ROOT_ID,
              text: { html: "", markdown: "" },
              rect: { x: 0, y: 0, width: 0, height: 0 },
              children: [],
              shape: "rect",
            },
          }

          for (const [index, text] of nodeTexts.entries()) {
            const id = nodeID(index)
            nodes[id] = {
              id,
              text,
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
              text: spec.text,
            }
          }

          return { nodes, edges }
        }),
    )

    await fc.assert(
      fc.asyncProperty(graphArbitrary, async graph => {
        const result = await page.evaluate(async graph => {
          const mermaid = window.arrowboxPw.toMermaid(graph, "Untitled")
          return {
            mermaid,
            parsed:
              (await window.arrowboxPw.fromMermaid(mermaid)) !== undefined,
          }
        }, graph)

        if (!result.parsed) throw new Error(result.mermaid)
      }),
      { numRuns: 50, seed: 20260701 },
    )
  })
})
