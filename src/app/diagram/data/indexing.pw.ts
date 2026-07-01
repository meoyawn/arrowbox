import { expect, test, type Page } from "@playwright/test"
import { ROOT_ID } from "./ROOT_ID.ts"
import type { Graph } from "./data.ts"

async function loadHarness(page: Page): Promise<void> {
  await page.goto("/")
  await page.setContent("<main></main>")
  await page.addScriptTag({
    type: "module",
    url: "/src/app/playwright-harness.ts",
  })
}

test.describe("buildIndex", () => {
  test("derives html for node and edge markdown", async ({ page }) => {
    await loadHarness(page)

    const graph: Graph = {
      id: "gIndexHtml",
      title: "Index HTML",
      nodes: {
        [ROOT_ID]: {
          id: ROOT_ID,
          markdown: "",
          rect: { x: 0, y: 0, width: 0, height: 0 },
          children: ["nNode"],
          shape: "rect",
        },
        nNode: {
          id: "nNode",
          markdown: "**Node**",
          rect: { x: 0, y: 0, width: 100, height: 100 },
          children: [],
          shape: "rect",
        },
      },
      edges: {
        eEdge: {
          id: "eEdge",
          from: { type: "node", id: "nNode" },
          to: { type: "node", id: "nNode" },
          markdown: "edge *label*",
        },
      },
    }

    const html = await page.evaluate(graph => {
      return window.arrowboxPw.indexHtml(graph)
    }, graph)

    expect(html["**Node**"]).toEqual("<p><strong>Node</strong></p>\n")
    expect(html["edge *label*"]).toEqual("<p>edge <em>label</em></p>\n")
  })

  test("reuses previous markdown html cache while adding new markdown", async ({
    page,
  }) => {
    await loadHarness(page)

    const graph: Graph = {
      id: "gIndexHtmlReuse",
      title: "Index HTML reuse",
      nodes: {
        [ROOT_ID]: {
          id: ROOT_ID,
          markdown: "",
          rect: { x: 0, y: 0, width: 0, height: 0 },
          children: ["nNode"],
          shape: "rect",
        },
        nNode: {
          id: "nNode",
          markdown: "**Node**",
          rect: { x: 0, y: 0, width: 100, height: 100 },
          children: [],
          shape: "rect",
        },
      },
      edges: {},
    }
    const next: Graph = {
      ...graph,
      nodes: {
        ...graph.nodes,
        nNode: {
          ...graph.nodes.nNode,
          markdown: "**Node**",
        },
        nOther: {
          id: "nOther",
          markdown: "`Other`",
          rect: { x: 0, y: 0, width: 100, height: 100 },
          children: [],
          shape: "rect",
        },
      },
    }
    next.nodes[ROOT_ID] = {
      ...next.nodes[ROOT_ID],
      children: ["nNode", "nOther"],
    }

    const html = await page.evaluate(
      ({ graph, next }) => {
        return window.arrowboxPw.indexHtmlWithPrevious(graph, next)
      },
      { graph, next },
    )

    expect(html["**Node**"]).toEqual("<p><strong>Node</strong></p>\n")
    expect(html["`Other`"]).toEqual("<p><code>Other</code></p>\n")
  })
})
