import { expect, test, type Page } from "@playwright/test"
import type { Graph, GraphID, NodeID } from "./data/data.ts"
import { ROOT_ID } from "./data/ROOT_ID.ts"
import {
  gotoGraphURLFragment,
  graphFromURLFragment,
} from "./url-fragment-test.ts"

interface DesktopMarkdownEditorNode {
  graphID: GraphID
  markdown: string
  nodeID: NodeID
  rect: { x: number; y: number; width: number; height: number }
  title: string
}

async function loadSingleNodeGraph(
  page: Page,
  node: DesktopMarkdownEditorNode,
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

  return { editor, nodeShape }
}

test.describe("markdown editor desktop", () => {
  test("inserts a markdown newline with Shift+Enter and commits with Enter on desktop", async ({
    page,
  }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-portal-editor-shift-enter",
      markdown: "alpha",
      nodeID: "nShiftEnter",
      rect: { x: 180, y: 160, width: 260, height: 180 },
      title: "Portal editor Shift Enter",
    })

    const { editor } = await openMarkdownEditor(page, "nShiftEnter")

    await page.keyboard.press("Shift+Enter")
    await page.keyboard.type("beta")

    await expect(editor).toHaveText("alpha\nbeta")

    await page.keyboard.press("Enter")
    await expect(editor).toHaveCount(0)

    await expect
      .poll(async () => {
        const graph = await graphFromURLFragment(page)
        return graph.nodes.nShiftEnter.markdown
      })
      .toEqual("alpha\nbeta")
  })

  test("keeps portal text editor locked to node while panning", async ({
    page,
  }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-portal-editor-pan",
      markdown: "Editable during pan",
      nodeID: "nPan",
      rect: { x: 220, y: 180, width: 220, height: 140 },
      title: "Portal editor pan",
    })

    const { editor, nodeShape } = await openMarkdownEditor(page, "nPan")

    async function editorAlignment(): Promise<{
      dx: number
      dy: number
      heightDelta: number
      nodeX: number
      widthDelta: number
    }> {
      const shape = await nodeShape.boundingBox()
      const editorBox = await editor.boundingBox()
      if (!shape || !editorBox) throw new Error("Missing alignment boxes")

      return {
        dx: editorBox.x - shape.x,
        dy: editorBox.y - shape.y,
        heightDelta: editorBox.height - shape.height,
        nodeX: shape.x,
        widthDelta: editorBox.width - shape.width,
      }
    }

    const before = await editorAlignment()
    expect(Math.abs(before.dx)).toBeLessThan(2)
    expect(Math.abs(before.dy)).toBeLessThan(2)
    expect(Math.abs(before.widthDelta)).toBeLessThan(2)
    expect(Math.abs(before.heightDelta)).toBeLessThan(2)

    await page.mouse.move(700, 500)
    await page.mouse.wheel(120, 80)
    await expect
      .poll(async () => (await editorAlignment()).nodeX)
      .not.toEqual(before.nodeX)

    const after = await editorAlignment()
    expect(Math.abs(after.dx)).toBeLessThan(2)
    expect(Math.abs(after.dy)).toBeLessThan(2)
    expect(Math.abs(after.widthDelta)).toBeLessThan(2)
    expect(Math.abs(after.heightDelta)).toBeLessThan(2)
  })

  test("aligns portal text editor with nested node on desktop Chrome", async ({
    page,
  }) => {
    const graph: Graph = {
      id: "g-portal-editor-nested",
      title: "Portal editor nested",
      nodes: {
        [ROOT_ID]: {
          id: ROOT_ID,
          children: ["nGateway"],
          rect: { x: 0, y: 0, width: 0, height: 0 },
          markdown: "",
          shape: "rect",
        },
        nGateway: {
          id: "nGateway",
          children: ["nBugged"],
          rect: { x: 90, y: 60, width: 430, height: 460 },
          markdown: "# Gateway\n\none\n\ntwo",
          shape: "rect",
        },
        nBugged: {
          id: "nBugged",
          children: [],
          rect: { x: 70, y: 250, width: 220, height: 170 },
          markdown: "bugged",
          shape: "rect",
        },
      },
      edges: {},
    }
    await gotoGraphURLFragment(page, graph)

    const { editor, nodeShape } = await openMarkdownEditor(page, "nBugged")
    const editorBox = await editor.boundingBox()
    const shapeBox = await nodeShape.boundingBox()
    if (!editorBox || !shapeBox) throw new Error("Missing nested editor boxes")

    expect(Math.abs(editorBox.x - shapeBox.x)).toBeLessThan(2)
    expect(Math.abs(editorBox.y - shapeBox.y)).toBeLessThan(2)
    expect(Math.abs(editorBox.width - shapeBox.width)).toBeLessThan(2)
    expect(Math.abs(editorBox.height - shapeBox.height)).toBeLessThan(2)
  })

  test("scales portal text editor typography with canvas zoom", async ({
    page,
  }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-portal-editor-zoom",
      markdown: "###\n# h4",
      nodeID: "nZoom",
      rect: { x: 220, y: 180, width: 220, height: 140 },
      title: "Portal editor zoom",
    })

    function parseScale(transform: string | null): number {
      const match = transform?.match(/scale\((-?\d+(?:\.\d+)?)\)$/)
      if (!match) throw new Error(`Invalid canvas transform: ${transform}`)

      return Number(match[1])
    }

    async function canvasScale(): Promise<number> {
      return parseScale(
        await page.locator("#canvas > g").getAttribute("transform"),
      )
    }

    const { editor, nodeShape } = await openMarkdownEditor(page, "nZoom")

    await page.mouse.move(700, 500)
    await page.keyboard.down("Control")
    await page.mouse.wheel(0, -400)
    await page.keyboard.up("Control")

    await expect.poll(canvasScale).toBeGreaterThan(1)
    const scale = await canvasScale()

    const metrics = await editor.evaluate(editor => {
      const style = getComputedStyle(editor)
      const rect = editor.getBoundingClientRect()

      return {
        borderTopWidth: Number.parseFloat(style.borderTopWidth),
        fontSize: Number.parseFloat(style.fontSize),
        height: rect.height,
        lineHeight: Number.parseFloat(style.lineHeight),
        paddingTop: Number.parseFloat(style.paddingTop),
        width: rect.width,
      }
    })
    const shape = await nodeShape.boundingBox()
    if (!shape) throw new Error("Missing zoomed node box")

    expect(Math.abs(metrics.fontSize - 16 * scale)).toBeLessThan(0.5)
    expect(Math.abs(metrics.lineHeight - 24 * scale)).toBeLessThan(0.5)
    expect(Math.abs(metrics.paddingTop - 8 * scale)).toBeLessThan(0.5)
    expect(Math.abs(metrics.borderTopWidth - 2 * scale)).toBeLessThan(0.5)
    expect(Math.abs(metrics.width - shape.width)).toBeLessThan(2)
    expect(Math.abs(metrics.height - shape.height)).toBeLessThan(2)
  })

  test("keeps portal text editor below diagram title chrome", async ({
    page,
  }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-portal-editor-title-layer",
      markdown: "#### h4",
      nodeID: "nTitleLayer",
      rect: { x: 0, y: 0, width: 760, height: 180 },
      title: "Portal title layer",
    })

    const nodeShape = page.locator(
      "[data-nodeID=nTitleLayer] [data-dragID=node] > rect",
    )
    const nodeBox = await nodeShape.boundingBox()
    if (!nodeBox) throw new Error("Missing node box")

    await page.mouse.dblclick(nodeBox.x + 100, nodeBox.y + 100)

    const editor = page.locator("[data-testid=foreign-text-editor]")
    await expect(editor).toBeFocused()

    const layer = await page.evaluate(() => {
      const title = document.querySelector("[data-testid=diagram-title]")
      const editor = document.querySelector("[data-testid=foreign-text-editor]")

      if (!(title instanceof HTMLElement)) throw new Error("Missing title")
      if (!(editor instanceof HTMLElement)) throw new Error("Missing editor")

      const titleRect = title.getBoundingClientRect()
      const editorRect = editor.getBoundingClientRect()
      const x = titleRect.left + titleRect.width / 2
      const y = titleRect.top + titleRect.height / 2
      const top = document.elementFromPoint(x, y)

      return {
        pointInsideEditor:
          x >= editorRect.left &&
          x <= editorRect.right &&
          y >= editorRect.top &&
          y <= editorRect.bottom,
        topIsEditor: top === editor || editor.contains(top),
        topIsTitle: top === title || title.contains(top),
      }
    })

    expect(layer.pointInsideEditor).toEqual(true)
    expect(layer.topIsEditor).toEqual(false)
    expect(layer.topIsTitle).toEqual(true)
  })
})
