import { expect, test, type Page } from "@playwright/test"
import type { Graph, GraphID, NodeID } from "./data/data.ts"
import { ROOT_ID } from "./data/ROOT_ID.ts"
import {
  gotoGraphURLFragment,
  graphFromURLFragment,
} from "./url-fragment-test.ts"

interface MarkdownEditorNode {
  graphID: GraphID
  markdown: string
  nodeID: NodeID
  rect: { x: number; y: number; width: number; height: number }
  title: string
}

async function loadSingleNodeGraph(
  page: Page,
  node: MarkdownEditorNode,
): Promise<void> {
  const graph: Graph = {
    id: node.graphID,
    title: node.title,
    nodes: {
      [ROOT_ID]: {
        id: ROOT_ID,
        children: [node.nodeID],
        rect: { x: 0, y: 0, width: 0, height: 0 },
        markdown: "",
        shape: "rect",
      },
      [node.nodeID]: {
        id: node.nodeID,
        children: [],
        rect: node.rect,
        markdown: node.markdown,
        shape: "rect",
      },
    },
    edges: {},
  }
  await gotoGraphURLFragment(page, graph)
}

async function openMarkdownEditor(page: Page, nodeID: string) {
  const nodeShape = page.locator(
    `[data-nodeID=${nodeID}] [data-dragID=node] > rect`,
  )
  const nodeBox = await nodeShape.boundingBox()
  if (!nodeBox) throw new Error("Missing node box")

  await page.mouse.dblclick(
    nodeBox.x + nodeBox.width / 2,
    nodeBox.y + nodeBox.height / 2,
  )

  const editor = page.locator("[data-testid=foreign-text-editor]")
  await expect(editor).toBeFocused()

  return editor
}

test.describe("mobile markdown editor", () => {
  test("opens full-screen outside SVG", async ({ page }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-mobile-markdown-fullscreen",
      markdown: "Edit me",
      nodeID: "nMobileEdit",
      rect: { x: 100, y: 260, width: 180, height: 120 },
      title: "Mobile markdown fullscreen",
    })

    const editor = await openMarkdownEditor(page, "nMobileEdit")
    const metrics = await editor.evaluate(editor => {
      const overlay = editor.closest("[data-testid=markdown-editor-overlay]")
      if (!(overlay instanceof HTMLElement)) throw new Error("Missing overlay")

      const overlayRect = overlay.getBoundingClientRect()
      const editorRect = editor.getBoundingClientRect()

      return {
        editorTop: editorRect.top,
        insideEditorLayer: Boolean(
          editor.closest("[data-testid=foreign-text-editor-layer]"),
        ),
        insideSvg: Boolean(editor.closest("svg")),
        overlayBottom: overlayRect.bottom,
        overlayHeight: overlayRect.height,
        overlayLeft: overlayRect.left,
        overlayPosition: getComputedStyle(overlay).position,
        overlayTop: overlayRect.top,
        overlayWidth: overlayRect.width,
        viewportHeight: document.documentElement.clientHeight,
        viewportWidth: document.documentElement.clientWidth,
      }
    })

    expect(metrics.insideEditorLayer).toEqual(true)
    expect(metrics.insideSvg).toEqual(false)
    expect(metrics.overlayPosition).toEqual("fixed")
    expect(metrics.overlayLeft).toEqual(0)
    expect(metrics.overlayTop).toEqual(0)
    expect(metrics.overlayWidth).toEqual(metrics.viewportWidth)
    expect(metrics.overlayHeight).toEqual(metrics.viewportHeight)
    expect(metrics.overlayBottom).toEqual(metrics.viewportHeight)
    expect(metrics.editorTop).toBeGreaterThan(0)
  })

  test("covers DiagramPage chrome", async ({ page }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-mobile-markdown-covers-chrome",
      markdown: "Overlay",
      nodeID: "nMobileChrome",
      rect: { x: 100, y: 260, width: 180, height: 120 },
      title: "Mobile markdown covers chrome",
    })

    await openMarkdownEditor(page, "nMobileChrome")

    const coverage = await page.evaluate(() => {
      const selectors = [
        "[data-testid=diagram-menu-link]",
        "[data-testid=diagram-title]",
        "[data-testid=diagram-bottom-controls]",
      ]

      return selectors.map(selector => {
        const chrome = document.querySelector(selector)
        if (!(chrome instanceof HTMLElement)) throw new Error(selector)

        const rect = chrome.getBoundingClientRect()
        const top = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        )

        return Boolean(top?.closest("[data-testid=markdown-editor-overlay]"))
      })
    })

    expect(coverage).toEqual([true, true, true])
  })

  test("Done commits markdown and closes editor", async ({ page }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-mobile-markdown-done",
      markdown: "Original",
      nodeID: "nMobileDone",
      rect: { x: 100, y: 260, width: 180, height: 120 },
      title: "Mobile markdown done",
    })

    const editor = await openMarkdownEditor(page, "nMobileDone")
    await editor.fill("Changed")
    await page.locator("[data-testid=markdown-editor-done]").click()

    await expect(editor).toHaveCount(0)
    await expect
      .poll(async () => {
        const graph = await graphFromURLFragment(page)
        return graph.nodes.nMobileDone.markdown
      })
      .toEqual("Changed")
  })

  test("Enter inserts newline and Done commits markdown", async ({ page }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-mobile-markdown-enter",
      markdown: "alpha",
      nodeID: "nMobileEnter",
      rect: { x: 100, y: 260, width: 180, height: 120 },
      title: "Mobile markdown enter",
    })

    const editor = await openMarkdownEditor(page, "nMobileEnter")
    await page.keyboard.press("Enter")
    await page.keyboard.type("beta")

    await expect(editor).toHaveText("alpha\nbeta")
    await expect(editor).toBeFocused()

    await page.locator("[data-testid=markdown-editor-done]").click()
    await expect(editor).toHaveCount(0)
    await expect
      .poll(async () => {
        const graph = await graphFromURLFragment(page)
        return graph.nodes.nMobileEnter.markdown
      })
      .toEqual("alpha\nbeta")
  })

  test("keyboard Done blur commits markdown and closes editor", async ({
    page,
  }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-mobile-markdown-keyboard-done",
      markdown: "Original",
      nodeID: "nMobileKeyboardDone",
      rect: { x: 100, y: 260, width: 180, height: 120 },
      title: "Mobile markdown keyboard done",
    })

    const editor = await openMarkdownEditor(page, "nMobileKeyboardDone")
    await editor.fill("Blurred")
    await expect(editor).toHaveText("Blurred")
    await editor.evaluate(editor => {
      editor.blur()
    })

    await expect(editor).toHaveCount(0)
    await expect
      .poll(async () => {
        const graph = await graphFromURLFragment(page)
        return graph.nodes.nMobileKeyboardDone.markdown
      })
      .toEqual("Blurred")
  })

  test("Cancel restores original markdown and closes editor", async ({
    page,
  }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-mobile-markdown-cancel",
      markdown: "Original",
      nodeID: "nMobileCancel",
      rect: { x: 100, y: 260, width: 180, height: 120 },
      title: "Mobile markdown cancel",
    })

    const editor = await openMarkdownEditor(page, "nMobileCancel")
    await editor.fill("Dirty")
    await page.locator("[data-testid=markdown-editor-cancel]").click()

    await expect(editor).toHaveCount(0)
    await expect
      .poll(async () => {
        const graph = await graphFromURLFragment(page)
        return graph.nodes.nMobileCancel.markdown
      })
      .toEqual("Original")
  })
})
