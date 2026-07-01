import { expect, test, type Page } from "@playwright/test"
import type { Graph, GraphID, NodeID } from "./diagram/data/data.ts"
import { ROOT_ID } from "./diagram/data/ROOT_ID.ts"
import {
  decodeGraphURLFragment,
  encodeGraphURLFragment,
} from "./diagram/data/url/codec.ts"

function graph(
  id: GraphID,
  title: string,
  nodeID: NodeID,
  label: string,
): Graph {
  return {
    id,
    title,
    nodes: {
      [ROOT_ID]: {
        id: ROOT_ID,
        children: [nodeID],
        rect: { x: 0, y: 0, width: 0, height: 0 },
        text: { html: "", markdown: "" },
        shape: "rect",
      },
      [nodeID]: {
        id: nodeID,
        children: [],
        rect: { x: 32, y: 48, width: 120, height: 80 },
        text: { html: label, markdown: label },
        shape: "rect",
      },
    },
    edges: {},
  }
}

async function gotoFragment(page: Page, graph: Graph): Promise<void> {
  await page.goto(`/${await encodeGraphURLFragment(graph)}`)
}

async function seedGraph(page: Page, graph: Graph): Promise<void> {
  await page.goto("/list")
  await page.evaluate(graph => {
    localStorage.setItem("last-graph", graph.id)
    localStorage.setItem(
      "graph-list",
      JSON.stringify({
        [graph.id]: {
          title: graph.title,
          lastModifiedMs: 1,
        },
      }),
    )
    localStorage.setItem(graph.id, JSON.stringify(graph))
  }, graph)
}

async function storageSnapshot(page: Page): Promise<{
  lastGraph: string | null
  list: Record<string, { title: string; lastModifiedMs: number }>
  graphs: Record<string, Graph>
}> {
  return page.evaluate(() => {
    const list = JSON.parse(
      localStorage.getItem("graph-list") ?? "{}",
    ) as Record<string, { title: string; lastModifiedMs: number }>
    const graphs: Record<string, Graph> = {}

    for (const id of Object.keys(list)) {
      const str = localStorage.getItem(id)
      if (str) graphs[id] = JSON.parse(str) as Graph
    }

    return {
      lastGraph: localStorage.getItem("last-graph"),
      list,
      graphs,
    }
  })
}

async function graphFromCurrentURL(page: Page): Promise<Graph> {
  return decodeGraphURLFragment(new URL(page.url()).hash)
}

test.describe("list graph persistence", () => {
  test("stores a new shared fragment under its decoded id and title", async ({
    page,
  }) => {
    const incoming = graph("gIncomingShared", "Yoo", "nIncoming", "Incoming")

    await gotoFragment(page, incoming)

    await expect(page.locator("[data-testid=diagram-title]")).toContainText(
      "Yoo",
    )
    await expect.poll(() => graphFromCurrentURL(page)).toEqual(incoming)
    await expect
      .poll(() => storageSnapshot(page))
      .toMatchObject({
        lastGraph: incoming.id,
        list: {
          [incoming.id]: { title: "Yoo" },
        },
        graphs: {
          [incoming.id]: incoming,
        },
      })

    await page.goto("/list")
    await expect(page.getByRole("link", { name: "Yoo" })).toBeVisible()
  })

  test("reuses an identical local fragment without adding a duplicate list entry", async ({
    page,
  }) => {
    const local = graph("gLocalSame", "My Local", "nLocal", "Local")
    await seedGraph(page, local)

    await gotoFragment(page, local)

    await expect(page.locator("[data-testid=diagram-title]")).toContainText(
      "My Local",
    )
    await expect
      .poll(() => storageSnapshot(page))
      .toMatchObject({
        lastGraph: local.id,
        graphs: {
          [local.id]: local,
        },
      })
    await expect
      .poll(async () => Object.keys((await storageSnapshot(page)).list))
      .toEqual([local.id])

    await page.goto("/list")
    await expect(page.getByRole("link", { name: "My Local" })).toHaveCount(1)
  })

  test("imports a conflicting shared fragment as a fresh graph without overwriting the local graph", async ({
    page,
  }) => {
    const local = graph("gCollision", "My Version", "nMine", "Mine")
    const incoming = graph("gCollision", "Remote Version", "nRemote", "Remote")
    await seedGraph(page, local)

    await gotoFragment(page, incoming)

    await expect(page.locator("[data-testid=diagram-title]")).toContainText(
      "Remote Version",
    )
    await expect
      .poll(async () => {
        const snapshot = await storageSnapshot(page)
        const ids = Object.keys(snapshot.list)
        const importedID = ids.find(id => id !== local.id)
        const imported = importedID ? snapshot.graphs[importedID] : undefined
        const urlGraph = await graphFromCurrentURL(page)

        return {
          importedGraph: imported,
          importedID,
          lastGraph: snapshot.lastGraph,
          listTitles: Object.fromEntries(
            ids.map(id => [id, snapshot.list[id].title]),
          ),
          localGraph: snapshot.graphs[local.id],
          urlGraph,
        }
      })
      .toMatchObject({
        importedGraph: {
          title: "Remote Version",
          nodes: {
            nRemote: {
              text: { markdown: "Remote" },
            },
          },
        },
        importedID: expect.not.stringMatching(/^gCollision$/),
        lastGraph: expect.not.stringMatching(/^gCollision$/),
        listTitles: {
          gCollision: "My Version",
        },
        localGraph: local,
        urlGraph: {
          title: "Remote Version",
          nodes: {
            nRemote: {
              text: { markdown: "Remote" },
            },
          },
        },
      })

    const snapshot = await storageSnapshot(page)
    const importedID = Object.keys(snapshot.list).find(id => id !== local.id)
    if (!importedID) throw new Error("Missing imported graph")
    expect(snapshot.graphs[importedID].id).toEqual(importedID)
    expect((await graphFromCurrentURL(page)).id).toEqual(importedID)

    await page.goto("/list")
    await expect(page.getByRole("link", { name: "My Version" })).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Remote Version" }),
    ).toBeVisible()
  })

  test("falls back from a gibberish fragment to the last graph and rewrites the URL", async ({
    page,
  }) => {
    const fallback = graph("gFallback", "Fallback Graph", "nFallback", "Saved")
    await seedGraph(page, fallback)

    await page.goto("/#ab1.g.gibberish")

    await expect(page.locator("[data-testid=diagram-title]")).toContainText(
      "Fallback Graph",
    )
    await expect.poll(() => graphFromCurrentURL(page)).toEqual(fallback)

    await page.goto("/list")
    await expect(
      page.getByRole("link", { name: "Fallback Graph" }),
    ).toBeVisible()
  })
})
