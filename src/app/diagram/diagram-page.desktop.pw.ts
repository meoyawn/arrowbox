import { expect, test } from "@playwright/test"
import { ROOT_ID } from "./data/ROOT_ID.ts"
import { gotoGraphURLFragment } from "./url-fragment-test.ts"

test.describe("diagram page desktop", () => {
  test("opens vertical edge markdown editor with readable proportions", async ({
    page,
  }) => {
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
})
