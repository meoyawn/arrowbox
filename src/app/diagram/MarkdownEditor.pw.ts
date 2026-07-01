import { expect, test, type Page } from "@playwright/test"
import type { Graph, GraphID, NodeID } from "./data/data.ts"
import { ROOT_ID } from "./data/ROOT_ID.ts"
import {
  gotoGraphURLFragment,
  graphFromURLFragment,
} from "./url-fragment-test.ts"

interface CameraTransform {
  x: number
  y: number
  k: number
}

interface MarkdownEditorNode {
  graphID: GraphID
  html: string
  markdown: string
  nodeID: NodeID
  rect: { x: number; y: number; width: number; height: number }
  title: string
}

interface TouchPoint {
  id: number
  x: number
  y: number
}

interface TestWheelEventInit {
  clientX: number
  clientY: number
  ctrlKey: boolean
  deltaY: number
}

function parseCameraTransform(transform: string | null): CameraTransform {
  const match = transform?.match(
    /^translate\((-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\) scale\((-?\d+(?:\.\d+)?)\)$/,
  )
  if (!match) throw new Error(`Invalid camera transform: ${transform}`)

  return {
    x: Number(match[1]),
    y: Number(match[2]),
    k: Number(match[3]),
  }
}

async function cameraTransform(page: Page): Promise<CameraTransform> {
  return parseCameraTransform(
    await page.locator("#canvas > g").getAttribute("transform"),
  )
}

async function dispatchTouch(
  page: Page,
  selector: string,
  type: string,
  points: Array<TouchPoint>,
): Promise<boolean> {
  return page.evaluate(
    ({ points, selector, type }) => {
      const target = document.querySelector(selector)
      if (!target) throw new Error(`No touch target: ${selector}`)

      const touchList = points.map(({ id, x, y }) => ({
        clientX: x,
        clientY: y,
        identifier: id,
        pageX: x,
        pageY: y,
        screenX: x,
        screenY: y,
        target,
      }))

      Object.defineProperty(touchList, "item", {
        value: (index: number) => touchList[index] ?? null,
      })

      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperty(event, "touches", { value: touchList })
      Object.defineProperty(event, "changedTouches", { value: touchList })
      Object.defineProperty(event, "targetTouches", { value: touchList })
      target.dispatchEvent(event)

      return event.defaultPrevented
    },
    { points, selector, type },
  )
}

async function dispatchWheel(
  page: Page,
  selector: string,
  init: TestWheelEventInit,
): Promise<boolean> {
  return page.evaluate(
    ({ init, selector }) => {
      const target = document.querySelector(selector)
      if (!target) throw new Error(`No wheel target: ${selector}`)

      const event = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        ...init,
      })
      target.dispatchEvent(event)

      return event.defaultPrevented
    },
    { init, selector },
  )
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

  return { editor, nodeBox, nodeShape }
}

test.describe("markdown editor", () => {
  test("renders foreign text visibly in block flow while reading and editing", async ({
    page,
  }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-foreign-text-visible",
      html: "<h1>Gateway</h1><p>stateless</p><p>replicas</p>",
      markdown: "# Gateway\n\nstateless\n\nreplicas",
      nodeID: "nText",
      rect: { x: 180, y: 160, width: 260, height: 180 },
      title: "Foreign text visible",
    })

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

    const { editor } = await openMarkdownEditor(page, "nText")
    const editMetrics = await editor.evaluate(editor => {
      const rect = editor.getBoundingClientRect()

      return {
        insideEditorLayer: Boolean(
          editor.closest("[data-testid=foreign-text-editor-layer]"),
        ),
        insideSvg: Boolean(editor.closest("svg")),
        height: rect.height,
        position: getComputedStyle(editor).position,
        width: rect.width,
      }
    })

    expect(editMetrics.insideEditorLayer).toEqual(true)
    expect(editMetrics.insideSvg).toEqual(false)
    expect(editMetrics.position).toEqual("absolute")
    expect(editMetrics.width).toBeGreaterThan(0)
    expect(editMetrics.height).toBeGreaterThan(0)
  })

  test("restores foreign text when escaping portal editor", async ({
    page,
  }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-portal-editor-escape",
      html: "<h1>Original</h1>",
      markdown: "# Original",
      nodeID: "nEscape",
      rect: { x: 180, y: 160, width: 260, height: 180 },
      title: "Portal editor escape",
    })

    const { editor } = await openMarkdownEditor(page, "nEscape")
    await editor.fill("# Dirty")
    await page.keyboard.press("Escape")

    await expect(editor).toHaveCount(0)
    await expect(
      page.locator("[data-nodeID=nEscape] [data-testid=foreign-text-content]"),
    ).toHaveText("Original")

    await expect
      .poll(async () => {
        const graph = await graphFromURLFragment(page)
        return graph.nodes.nEscape.markdown
      })
      .toEqual("# Original")
  })

  test("keeps empty placeholder outside the caret text flow", async ({
    page,
  }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-portal-editor-empty-placeholder",
      html: "",
      markdown: "",
      nodeID: "nPlaceholder",
      rect: { x: 180, y: 160, width: 260, height: 180 },
      title: "Portal editor placeholder",
    })

    const { editor } = await openMarkdownEditor(page, "nPlaceholder")

    const metrics = await editor.evaluate(editor => {
      const before = getComputedStyle(editor, "::before")
      const style = getComputedStyle(editor)

      return {
        beforeLeft: Number.parseFloat(before.left),
        beforePosition: before.position,
        beforeTop: Number.parseFloat(before.top),
        paddingLeft: Number.parseFloat(style.paddingLeft),
        paddingTop: Number.parseFloat(style.paddingTop),
      }
    })

    expect(metrics.beforePosition).toEqual("absolute")
    expect(Math.abs(metrics.beforeLeft - metrics.paddingLeft)).toBeLessThan(0.5)
    expect(Math.abs(metrics.beforeTop - metrics.paddingTop)).toBeLessThan(0.5)
  })

  test("inserts a markdown newline with Shift+Enter", async ({ page }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-portal-editor-shift-enter",
      html: "<p>alpha</p>",
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

  test("does not insert markdown newlines with ArrowDown at the editor bottom", async ({
    page,
  }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-portal-editor-arrow-down",
      html: "",
      markdown: "",
      nodeID: "nArrowDown",
      rect: { x: 180, y: 160, width: 260, height: 180 },
      title: "Portal editor Arrow Down",
    })

    const { editor } = await openMarkdownEditor(page, "nArrowDown")

    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("ArrowDown")

    await expect
      .poll(async () =>
        editor.evaluate(editor => ({
          empty: editor.getAttribute("data-empty"),
          text: editor.textContent,
        })),
      )
      .toEqual({ empty: "true", text: "" })

    await page.keyboard.type("alpha")
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("ArrowDown")

    await expect(editor).toHaveText("alpha")
  })

  test("collapses selection after deleting fully selected markdown", async ({
    page,
  }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-portal-editor-full-delete",
      html: "<p>alpha beta</p>",
      markdown: "alpha beta",
      nodeID: "nFullDelete",
      rect: { x: 180, y: 160, width: 260, height: 180 },
      title: "Portal editor full delete",
    })

    const { editor } = await openMarkdownEditor(page, "nFullDelete")

    await page.keyboard.press("Meta+A")
    await page.keyboard.press("Delete")

    await expect
      .poll(async () =>
        editor.evaluate(editor => {
          const selection = getSelection()

          return {
            empty: editor.getAttribute("data-empty"),
            selectedText: selection?.toString() ?? "",
            selectionCollapsed: selection?.isCollapsed ?? false,
            text: editor.textContent,
          }
        }),
      )
      .toEqual({
        empty: "true",
        selectedText: "",
        selectionCollapsed: true,
        text: "",
      })
  })

  test("double-clicking active foreign text editor selects a word instead of adding a node", async ({
    page,
  }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-portal-editor-word-select",
      html: "<p>alpha beta gamma</p>",
      markdown: "alpha beta gamma",
      nodeID: "nWord",
      rect: { x: 180, y: 160, width: 280, height: 140 },
      title: "Portal editor word select",
    })

    const { editor } = await openMarkdownEditor(page, "nWord")
    await expect(page.locator("[data-nodeID]")).toHaveCount(1)
    await expect(editor).toHaveText("alpha beta gamma")

    const betaPoint = await editor.evaluate(editor => {
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
      let textNode = walker.nextNode()

      while (textNode) {
        const text = textNode.textContent ?? ""
        const index = text.indexOf("beta")

        if (index >= 0) {
          const range = document.createRange()
          range.setStart(textNode, index)
          range.setEnd(textNode, index + "beta".length)
          const rect = range.getBoundingClientRect()

          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          }
        }

        textNode = walker.nextNode()
      }

      throw new Error("Missing beta text")
    })

    await page.mouse.dblclick(betaPoint.x, betaPoint.y)

    await expect(editor).toBeFocused()
    await expect(page.locator("[data-nodeID]")).toHaveCount(1)
    await expect
      .poll(async () =>
        editor.evaluate(() => {
          return getSelection()?.toString()
        }),
      )
      .toEqual("beta")
  })

  test("highlights markdown bullets and backtick markers in active foreign text editor", async ({
    page,
  }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-portal-editor-marker-highlight",
      html: "<ul><li>GET <code>sku_id</code> -&gt; <code>product_json</code></li><li>GET <code>[]sku_id</code> -&gt; <code>[]product_json</code></li></ul>",
      markdown:
        "- GET `sku_id` -> `product_json`\n- GET `[]sku_id` -> `[]product_json`",
      nodeID: "nMarkers",
      rect: { x: 120, y: 140, width: 480, height: 180 },
      title: "Portal editor marker highlight",
    })

    const { editor } = await openMarkdownEditor(page, "nMarkers")
    await expect(editor).toContainText(
      "- GET `sku_id` -> `product_json`\n- GET `[]sku_id` -> `[]product_json`",
    )

    const markerCounts = await editor.evaluate(editor => {
      const spans = Array.from(editor.querySelectorAll("span"))

      return {
        codeSpans: spans.filter(span => span.classList.contains("code-snippet"))
          .length,
        bullets: spans.filter(span => span.textContent === "-").length,
      }
    })

    expect(markerCounts).toEqual({ codeSpans: 4, bullets: 2 })
  })

  test("keeps portal text editor locked to node while panning", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chrome",
      "mouse.wheel is not supported in mobile WebKit",
    )

    await loadSingleNodeGraph(page, {
      graphID: "g-portal-editor-pan",
      html: "<p>Editable during pan</p>",
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

  test("scales portal text editor typography with canvas zoom", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chrome",
      "mouse.wheel is not supported in mobile WebKit",
    )

    await loadSingleNodeGraph(page, {
      graphID: "g-portal-editor-zoom",
      html: "<p>###</p><p># h4</p>",
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

  test("pinch zooms canvas while portal markdown editor is active", async ({
    page,
  }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-portal-editor-pinch-forward",
      html: "<p>Pinch while editing</p>",
      markdown: "Pinch while editing",
      nodeID: "nPinch",
      rect: { x: 200, y: 180, width: 240, height: 160 },
      title: "Portal editor pinch",
    })

    await openMarkdownEditor(page, "nPinch")
    expect((await cameraTransform(page)).k).toEqual(1)

    const wheelPrevented = await dispatchWheel(page, "body", {
      clientX: 300,
      clientY: 250,
      ctrlKey: true,
      deltaY: -400,
    })

    expect(wheelPrevented).toEqual(true)
    await expect
      .poll(async () => (await cameraTransform(page)).k)
      .toBeGreaterThan(1)

    const startPrevented = await dispatchTouch(
      page,
      "[data-testid=foreign-text-editor]",
      "touchstart",
      [
        { id: 1, x: 250, y: 250 },
        { id: 2, x: 350, y: 250 },
      ],
    )
    const movePrevented = await dispatchTouch(
      page,
      "[data-testid=foreign-text-editor]",
      "touchmove",
      [
        { id: 1, x: 220, y: 230 },
        { id: 2, x: 400, y: 230 },
      ],
    )

    expect(startPrevented).toEqual(true)
    expect(movePrevented).toEqual(true)
    await expect
      .poll(async () => (await cameraTransform(page)).k)
      .toBeGreaterThan(1.5)

    await dispatchTouch(
      page,
      "[data-testid=foreign-text-editor]",
      "touchend",
      [],
    )
  })

  test("keeps portal text editor below diagram title chrome", async ({
    page,
  }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-portal-editor-title-layer",
      html: "<h4>h4</h4>",
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

  test("keeps focus and deletes text when backspace is pressed repeatedly", async ({
    page,
  }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-markdown-editor-backspace",
      html: "<p>abcdef</p>",
      markdown: "abcdef",
      nodeID: "nBackspace",
      rect: { x: 180, y: 160, width: 260, height: 180 },
      title: "Markdown editor backspace",
    })

    const { editor } = await openMarkdownEditor(page, "nBackspace")

    await page.keyboard.press("Backspace")
    await expect(editor).toBeFocused()
    await page.keyboard.press("Backspace")

    await expect(editor).toBeFocused()
    await expect(editor).toHaveText("abcd")
    await expect(page.locator("[data-nodeID=nBackspace]")).toHaveCount(1)
  })

  test("keeps platform word-delete shortcuts inside the editor", async ({
    page,
  }) => {
    await loadSingleNodeGraph(page, {
      graphID: "g-markdown-editor-word-delete",
      html: "<p>alpha beta</p>",
      markdown: "alpha beta",
      nodeID: "nWordDelete",
      rect: { x: 180, y: 160, width: 260, height: 180 },
      title: "Markdown editor word delete",
    })

    const { editor } = await openMarkdownEditor(page, "nWordDelete")

    await page.keyboard.press("Backspace")
    await page.keyboard.press("Backspace")
    await expect(editor).toBeFocused()
    await expect(editor).toHaveText("alpha be")

    await page.keyboard.press("Alt+Backspace")

    await expect(editor).toBeFocused()
    await expect(editor).toHaveText("alpha ")
    await expect(page.locator("[data-nodeID=nWordDelete]")).toHaveCount(1)
  })
})
