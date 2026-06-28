import { expect, test, type Page } from "@playwright/test"

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
  test("renders foreign text visibly in block flow while reading and editing", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const graphID = "g-foreign-text-visible"
      localStorage.setItem("last-graph", graphID)
      localStorage.setItem(
        "graph-list",
        JSON.stringify({
          [graphID]: { title: "Foreign text visible", lastModifiedMs: 0 },
        }),
      )
      localStorage.setItem(
        graphID,
        JSON.stringify({
          nodes: {
            nRoot: {
              id: "nRoot",
              children: ["nText"],
              rect: { x: 0, y: 0, width: 0, height: 0 },
              text: { html: "", markdown: "" },
              shape: "rect",
            },
            nText: {
              id: "nText",
              children: [],
              rect: { x: 180, y: 160, width: 260, height: 180 },
              text: {
                html: "<h1>Gateway</h1><p>stateless</p><p>replicas</p>",
                markdown: "# Gateway\n\nstateless\n\nreplicas",
              },
              shape: "rect",
            },
          },
          edges: {},
        }),
      )
    })
    await page.goto("/")

    const readMetrics = await page
      .locator("[data-nodeID=nText]")
      .evaluate(node => {
        const content = node.querySelector("[data-testid=foreign-text-content]")
        const heading = content?.querySelector("h1")
        const paragraphs = Array.from(content?.querySelectorAll("p") ?? [])
        const firstParagraph = paragraphs[0]
        const secondParagraph = paragraphs[1]

        if (
          !(content instanceof HTMLElement) ||
          !(heading instanceof HTMLElement) ||
          !(firstParagraph instanceof HTMLElement) ||
          !(secondParagraph instanceof HTMLElement)
        ) {
          throw new Error("Missing foreign text content")
        }

        const contentRect = content.getBoundingClientRect()
        const headingRect = heading.getBoundingClientRect()
        const firstRect = firstParagraph.getBoundingClientRect()
        const secondRect = secondParagraph.getBoundingClientRect()

        return {
          contentDisplay: getComputedStyle(content).display,
          contentHeight: contentRect.height,
          contentWidth: contentRect.width,
          firstBottom: firstRect.bottom,
          firstHeight: firstRect.height,
          firstTop: firstRect.top,
          headingBottom: headingRect.bottom,
          headingHeight: headingRect.height,
          headingTop: headingRect.top,
          secondHeight: secondRect.height,
          secondTop: secondRect.top,
        }
      })

    expect(readMetrics.contentDisplay).not.toEqual("flex")
    expect(readMetrics.contentWidth).toBeGreaterThan(0)
    expect(readMetrics.contentHeight).toBeGreaterThan(0)
    expect(readMetrics.headingHeight).toBeGreaterThan(0)
    expect(readMetrics.firstHeight).toBeGreaterThan(0)
    expect(readMetrics.secondHeight).toBeGreaterThan(0)
    expect(readMetrics.firstTop).toBeGreaterThan(readMetrics.headingTop)
    expect(readMetrics.secondTop).toBeGreaterThan(readMetrics.firstBottom)

    const nodeBox = await page
      .locator("[data-nodeID=nText] [data-dragID=node] > rect")
      .boundingBox()
    if (!nodeBox) throw new Error("Missing node box")

    await page.mouse.dblclick(
      nodeBox.x + nodeBox.width / 2,
      nodeBox.y + nodeBox.height / 2,
    )

    const editMetrics = await page
      .locator("[data-nodeID=nText] textarea")
      .evaluate(textarea => {
        const rect = textarea.getBoundingClientRect()

        return {
          height: rect.height,
          position: getComputedStyle(textarea).position,
          width: rect.width,
        }
      })

    expect(editMetrics.position).not.toEqual("fixed")
    expect(editMetrics.width).toBeGreaterThan(0)
    expect(editMetrics.height).toBeGreaterThan(0)
  })

  test("selects edge from larger hover target", async ({ page }) => {
    await page.addInitScript(() => {
      const graphID = "g-edge-hit-target"
      localStorage.setItem("last-graph", graphID)
      localStorage.setItem(
        "graph-list",
        JSON.stringify({
          [graphID]: { title: "Hit target", lastModifiedMs: 0 },
        }),
      )
      localStorage.setItem(
        graphID,
        JSON.stringify({
          nodes: {
            nRoot: {
              id: "nRoot",
              children: ["nLeft", "nRight"],
              rect: { x: 0, y: 0, width: 0, height: 0 },
              text: { html: "", markdown: "" },
              shape: "rect",
            },
            nLeft: {
              id: "nLeft",
              children: [],
              rect: { x: 100, y: 100, width: 100, height: 100 },
              text: { html: "Left", markdown: "Left" },
              shape: "rect",
            },
            nRight: {
              id: "nRight",
              children: [],
              rect: { x: 300, y: 100, width: 100, height: 100 },
              text: { html: "Right", markdown: "Right" },
              shape: "rect",
            },
          },
          edges: {
            eMain: {
              id: "eMain",
              from: { type: "node", id: "nLeft" },
              to: { type: "node", id: "nRight" },
              text: { html: "", markdown: "" },
            },
          },
        }),
      )
    })
    await page.goto("/")

    await page.mouse.click(250, 156)

    await expect(
      page.locator("[data-edgeID=eMain] .stroke-blue-600.stroke-2"),
    ).toHaveCount(1)
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
