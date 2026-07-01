import { expect, test, type Page } from "@playwright/test"
import fc from "fast-check"
import { ROOT_ID } from "../ROOT_ID.ts"
import type { Graph } from "../data.ts"
import { graphArbitrary } from "../testing/graph-arbitrary.ts"

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
      id: "gMermaidStringify",
      title: "Untitled",
      nodes: {
        [ROOT_ID]: {
          id: ROOT_ID,
          markdown: "",
          rect: { x: 0, y: 0, width: 0, height: 0 },
          children: ["nsource", "ntarget"],
          shape: "rect",
        },
        nsource: {
          id: "nsource",
          markdown: 'GET "/encode/:photo_key": `photo_key` -> `[80]f32`',
          rect: { x: 0, y: 0, width: 0, height: 0 },
          children: [],
          shape: "rect",
        },
        ntarget: {
          id: "ntarget",
          markdown: "Elastic",
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
          markdown: 'query "vec"',
        },
      },
    }

    const result = await page.evaluate(async graph => {
      const mermaid = window.arrowboxPw.toMermaid(graph)
      return {
        mermaid,
        parsed: (await window.arrowboxPw.fromMermaid(mermaid)) !== undefined,
      }
    }, graph)

    expect(result.mermaid).toContain("#quot;/encode/:photo_key#quot;")
    expect(result.mermaid).toContain("&#96;photo_key&#96;")
    expect(result.mermaid).toContain('source("`GET')
    expect(result.mermaid).toContain("query #quot;vec#quot;")
    expect(result.parsed).toEqual(true)
  })

  test("generated graphs stringify to parseable mermaid", async ({ page }) => {
    test.setTimeout(60_000)
    await loadHarness(page)

    await fc.assert(
      fc.asyncProperty(graphArbitrary, async graph => {
        const result = await page.evaluate(async graph => {
          const mermaid = window.arrowboxPw.toMermaid(graph)
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
