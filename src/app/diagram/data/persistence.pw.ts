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

test.describe("storage migrations", () => {
  test("migrates missing-version v1 graphs to v2 markdown-only storage", async ({
    page,
  }) => {
    await loadHarness(page)

    const result = await page.evaluate(rootID => {
      localStorage.clear()
      localStorage.setItem(
        "graph-list",
        JSON.stringify({
          gLegacy: {
            title: "Legacy graph",
            lastModifiedMs: 123,
            archived: true,
          },
        }),
      )
      localStorage.setItem("last-graph", "gLastOnly")
      localStorage.setItem(
        "gLegacy",
        JSON.stringify({
          id: "gLegacy",
          title: "Legacy graph",
          nodes: {
            [rootID]: {
              id: rootID,
              text: { markdown: "", html: "<p>cached root</p>" },
              rect: { x: 0, y: 0, width: 0, height: 0 },
              children: ["nParent"],
              shape: "rect",
            },
            nParent: {
              id: "nParent",
              text: { markdown: "**Parent**", html: "<strong>stale</strong>" },
              rect: { x: 1, y: 2, width: 3, height: 4 },
              children: ["nChild"],
              shape: "ellipse",
            },
            nChild: {
              id: "nChild",
              text: { markdown: "Child", html: "<em>stale</em>" },
              rect: { x: 5, y: 6, width: 7, height: 8 },
              children: [],
              shape: "rect",
            },
          },
          edges: {
            eLegacy: {
              id: "eLegacy",
              from: { type: "node", id: "nParent" },
              to: { type: "relative", id: "nChild", x: 0.25, y: 0.75 },
              text: { markdown: "edge *md*", html: "<p>cached edge</p>" },
            },
          },
        }),
      )
      localStorage.setItem(
        "gLastOnly",
        JSON.stringify({
          id: "gLastOnly",
          title: "Last only",
          nodes: {
            [rootID]: {
              id: rootID,
              text: { markdown: "", html: "" },
              rect: { x: 0, y: 0, width: 0, height: 0 },
              children: [],
              shape: "rect",
            },
          },
          edges: {},
        }),
      )

      window.arrowboxPw.ensureStorageMigrations()

      return {
        lastGraph: window.arrowboxPw.getLastGraph(),
        legacyGraph: JSON.parse(localStorage.getItem("gLegacy") ?? ""),
        list: window.arrowboxPw.getStoredGraphs(),
        version: localStorage.getItem("storage-version"),
      }
    }, ROOT_ID)

    expect(result.version).toEqual("2")
    expect(result.list).toEqual({
      gLegacy: {
        title: "Legacy graph",
        lastModifiedMs: 123,
        archived: true,
      },
    })
    const expectedLegacyGraph: Graph = {
      id: "gLegacy",
      title: "Legacy graph",
      nodes: {
        [ROOT_ID]: {
          id: ROOT_ID,
          markdown: "",
          rect: { x: 0, y: 0, width: 0, height: 0 },
          children: ["nParent"],
          shape: "rect",
        },
        nParent: {
          id: "nParent",
          markdown: "**Parent**",
          rect: { x: 1, y: 2, width: 3, height: 4 },
          children: ["nChild"],
          shape: "ellipse",
        },
        nChild: {
          id: "nChild",
          markdown: "Child",
          rect: { x: 5, y: 6, width: 7, height: 8 },
          children: [],
          shape: "rect",
        },
      },
      edges: {
        eLegacy: {
          id: "eLegacy",
          from: { type: "node", id: "nParent" },
          to: { type: "relative", id: "nChild", x: 0.25, y: 0.75 },
          markdown: "edge *md*",
        },
      },
    }
    expect(result.legacyGraph).toEqual(expectedLegacyGraph)

    const expectedLastGraph: Graph = {
      id: "gLastOnly",
      title: "Last only",
      nodes: {
        [ROOT_ID]: {
          id: ROOT_ID,
          markdown: "",
          rect: { x: 0, y: 0, width: 0, height: 0 },
          children: [],
          shape: "rect",
        },
      },
      edges: {},
    }
    expect(result.lastGraph.graph).toEqual(expectedLastGraph)
  })
})
