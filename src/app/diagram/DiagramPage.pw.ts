import { expect, test, type Page } from "@playwright/test"
import type { Graph } from "./data/data.ts"
import { ROOT_ID } from "./data/ROOT_ID.ts"
import {
  gotoGraphURLFragment,
  graphFromURLFragment,
} from "./url-fragment-test.ts"

async function expectDialogAboveOverlay(page: Page): Promise<void> {
  const layer = await page.evaluate(() => {
    const overlay = Array.from(document.querySelectorAll("*")).find(
      el =>
        el instanceof HTMLElement && el.classList.contains("bg-gray-900/50"),
    )
    const panel = document.querySelector(".max-w-md")

    if (!(overlay instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
      return { topIsInsidePanel: false, topIsOverlay: false }
    }

    const rect = panel.getBoundingClientRect()
    const top = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    )

    return {
      topIsInsidePanel: top === panel || panel.contains(top),
      topIsOverlay: top === overlay,
    }
  })

  expect(layer).toEqual({
    topIsInsidePanel: true,
    topIsOverlay: false,
  })
}

test.describe("diagram page", () => {
  test("opens vertical edge markdown editor with readable proportions", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chrome",
      "mobile uses a full-screen markdown editor",
    )

    await gotoGraphURLFragment(page, {
      id: "gVerticalEdgeEditor",
      title: "Vertical edge editor",
      nodes: {
        [ROOT_ID]: {
          id: ROOT_ID,
          children: ["nTop", "nBottom"],
          rect: { x: 0, y: 0, width: 0, height: 0 },
          markdown: "",
          shape: "rect",
        },
        nTop: {
          id: "nTop",
          children: [],
          rect: { x: 100, y: 60, width: 240, height: 120 },
          markdown: "Top",
          shape: "rect",
        },
        nBottom: {
          id: "nBottom",
          children: [],
          rect: { x: 100, y: 420, width: 240, height: 120 },
          markdown: "Bottom",
          shape: "rect",
        },
      },
      edges: {
        eVertical: {
          id: "eVertical",
          from: { type: "node", id: "nTop" },
          to: { type: "node", id: "nBottom" },
          markdown: "",
        },
      },
    })

    await page.mouse.dblclick(220, 300)

    const editor = page.locator("[data-testid=foreign-text-editor]")
    await expect(editor).toBeFocused()
    await expect
      .poll(async () => {
        const box = await editor.boundingBox()
        if (!box) throw new Error("Missing editor box")

        return {
          centeredOnEdge: Math.abs(box.x + box.width / 2 - 220) < 1,
          height: Math.round(box.height),
          isReadableShape: box.width > box.height * 2,
          width: Math.round(box.width),
        }
      })
      .toEqual({
        centeredOnEdge: true,
        height: 64,
        isReadableShape: true,
        width: 180,
      })
  })

  test("selects edge from larger hover target", async ({ page }) => {
    await gotoGraphURLFragment(page, {
      id: "gEdgeHoverTarget",
      title: "Edge hover target",
      nodes: {
        [ROOT_ID]: {
          id: ROOT_ID,
          children: ["nLeft", "nRight"],
          rect: { x: 0, y: 0, width: 0, height: 0 },
          markdown: "",
          shape: "rect",
        },
        nLeft: {
          id: "nLeft",
          children: [],
          rect: { x: 100, y: 100, width: 100, height: 100 },
          markdown: "Left",
          shape: "rect",
        },
        nRight: {
          id: "nRight",
          children: [],
          rect: { x: 300, y: 100, width: 100, height: 100 },
          markdown: "Right",
          shape: "rect",
        },
      },
      edges: {
        eMain: {
          id: "eMain",
          from: { type: "node", id: "nLeft" },
          to: { type: "node", id: "nRight" },
          markdown: "",
        },
      },
    })

    await page.mouse.click(250, 156)

    await expect(
      page.locator("[data-edgeID=eMain] .stroke-blue-600.stroke-2"),
    ).toHaveCount(1)
  })

  test("expands nested parents when dropping a large child into them", async ({
    page,
  }) => {
    await gotoGraphURLFragment(page, {
      id: "gNestedParentDrop",
      title: "Nested parent drop",
      nodes: {
        [ROOT_ID]: {
          id: ROOT_ID,
          children: ["nGrand", "nDragged"],
          rect: { x: 0, y: 0, width: 0, height: 0 },
          markdown: "",
          shape: "rect",
        },
        nGrand: {
          id: "nGrand",
          children: ["nParent"],
          rect: { x: 300, y: 220, width: 120, height: 120 },
          markdown: "Grand",
          shape: "rect",
        },
        nParent: {
          id: "nParent",
          children: [],
          rect: { x: 20, y: 20, width: 80, height: 80 },
          markdown: "Parent",
          shape: "rect",
        },
        nDragged: {
          id: "nDragged",
          children: [],
          rect: { x: 80, y: 240, width: 140, height: 140 },
          markdown: "Dragged",
          shape: "rect",
        },
      },
      edges: {},
    })

    const draggedShape = page.locator(
      "[data-nodeID=nDragged] [data-dragID=node] > rect",
    )
    const parentShape = page.locator(
      "[data-nodeID=nParent] [data-dragID=node] > rect",
    )
    const draggedBox = await draggedShape.boundingBox()
    const parentBox = await parentShape.boundingBox()
    if (!draggedBox || !parentBox) throw new Error("Missing node boxes")

    await page.mouse.move(draggedBox.x + 20, draggedBox.y + 20)
    await page.mouse.down()
    await page.mouse.move(
      parentBox.x + parentBox.width / 2,
      parentBox.y + parentBox.height / 2,
      { steps: 8 },
    )
    await page.mouse.up()

    await expect
      .poll(async () => {
        const graph = await graphFromURLFragment(page)
        return page.evaluate(graph => {
          const dragged = graph.nodes.nDragged.rect
          const grand = graph.nodes.nGrand.rect
          const parent = graph.nodes.nParent.rect
          const parentNode = document.querySelector("[data-nodeID=nParent]")
          const parentShape = parentNode?.querySelector(
            "[data-dragID=node] > rect",
          )
          const draggedShape = document.querySelector(
            "[data-nodeID=nDragged] [data-dragID=node] > rect",
          )
          const labelMeasure = document.createElement("div")
          labelMeasure.className =
            "prose invisible fixed max-w-prose left-0 top-0"
          labelMeasure.textContent = graph.nodes.nParent.markdown
          document.body.append(labelMeasure)
          const labelHeight = labelMeasure.getBoundingClientRect().height
          labelMeasure.remove()
          const parentBox = parentShape?.getBoundingClientRect()
          const draggedBox = draggedShape?.getBoundingClientRect()

          return {
            childBelowParentText: Boolean(
              parentBox &&
              draggedBox &&
              draggedBox.top >= parentBox.top + labelHeight,
            ),
            childInsideParent:
              dragged.x >= 0 &&
              dragged.y >= 0 &&
              dragged.x + dragged.width <= parent.width &&
              dragged.y + dragged.height <= parent.height,
            grandChildren: graph.nodes.nGrand.children,
            grandGrew: grand.width > 120 && grand.height > 120,
            parentChildren: graph.nodes.nParent.children,
            parentGrew: parent.width > 80 && parent.height > 80,
            parentInsideGrand:
              parent.x >= 0 &&
              parent.y >= 0 &&
              parent.x + parent.width <= grand.width &&
              parent.y + parent.height <= grand.height,
            root: graph.nodes.nRoot.rect,
            rootChildren: graph.nodes.nRoot.children,
          }
        }, graph)
      })
      .toEqual({
        childBelowParentText: true,
        childInsideParent: true,
        grandChildren: ["nParent"],
        grandGrew: true,
        parentChildren: ["nDragged"],
        parentGrew: true,
        parentInsideGrand: true,
        root: { x: 0, y: 0, width: 0, height: 0 },
        rootChildren: ["nGrand"],
      })
  })

  test("loads last graph from storage and replaces root URL with fragment", async ({
    page,
  }) => {
    const graph: Graph = {
      id: "g-persisted-url-fragment",
      title: "Persisted URL Fragment",
      nodes: {
        [ROOT_ID]: {
          id: ROOT_ID,
          children: ["nPersisted"],
          rect: { x: 0, y: 0, width: 0, height: 0 },
          markdown: "",
          shape: "rect",
        },
        nPersisted: {
          id: "nPersisted",
          children: [],
          rect: { x: 42, y: 24, width: 100, height: 80 },
          markdown: "Persisted",
          shape: "ellipse",
        },
      },
      edges: {},
    }

    await page.addInitScript(
      ({ graph }) => {
        const graphID = "g-persisted-url-fragment"
        localStorage.setItem("last-graph", graphID)
        localStorage.setItem(
          "graph-list",
          JSON.stringify({
            [graphID]: { title: "Persisted URL Fragment", lastModifiedMs: 0 },
          }),
        )
        localStorage.setItem(graphID, JSON.stringify(graph))
      },
      { graph },
    )
    await page.goto("/")

    await expect
      .poll(() => {
        const url = new URL(page.url())
        return {
          hashIsCodecFragment: url.hash.startsWith("#ab2.g."),
          pathname: url.pathname,
        }
      })
      .toEqual({ hashIsCodecFragment: true, pathname: "/" })
    await expect.poll(async () => graphFromURLFragment(page)).toEqual(graph)
  })

  test("keeps shortcut dialog above its overlay", async ({ page }) => {
    await page.goto("/")

    const helpButton = page.getByRole("button", { exact: true, name: "?" })
    const closeButton = page.getByRole("button", {
      exact: true,
      name: "Close",
    })

    for (let i = 0; i < 5; i++) {
      await helpButton.click()
      await expect(
        page.getByText("Keyboard shortcuts", { exact: true }),
      ).toBeVisible()
      await expectDialogAboveOverlay(page)
      await closeButton.click()
      await expect(
        page.getByText("Keyboard shortcuts", { exact: true }),
      ).toBeHidden()
    }
  })
})
