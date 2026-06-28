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

    for (let i = 0; i < 5; i++) {
      await helpButton.click()
      await expect(
        page.getByText("Keyboard shortcuts", { exact: true }),
      ).toBeVisible()
      await expectDialogAboveOverlay(page)
      await page.keyboard.press("Escape")
      await expect(
        page.getByText("Keyboard shortcuts", { exact: true }),
      ).toBeHidden()
    }
  })
})
