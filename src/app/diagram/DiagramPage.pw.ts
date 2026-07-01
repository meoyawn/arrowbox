import { expect, test, type Page } from "@playwright/test"

interface CameraTransform {
  x: number
  y: number
  k: number
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
      .locator("[data-testid=foreign-text-editor]")
      .evaluate(textarea => {
        const rect = textarea.getBoundingClientRect()

        return {
          insideEditorLayer: Boolean(
            textarea.closest("[data-testid=foreign-text-editor-layer]"),
          ),
          insideSvg: Boolean(textarea.closest("svg")),
          height: rect.height,
          position: getComputedStyle(textarea).position,
          width: rect.width,
        }
      })

    expect(editMetrics.insideEditorLayer).toEqual(true)
    expect(editMetrics.insideSvg).toEqual(false)
    expect(editMetrics.position).toEqual("absolute")
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

  test("expands nested parents when dropping a large child into them", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const graphID = "g-drop-expands-nested-parents"
      localStorage.setItem("last-graph", graphID)
      localStorage.setItem(
        "graph-list",
        JSON.stringify({
          [graphID]: { title: "Drop expands parents", lastModifiedMs: 0 },
        }),
      )
      localStorage.setItem(
        graphID,
        JSON.stringify({
          nodes: {
            nRoot: {
              id: "nRoot",
              children: ["nGrand", "nDragged"],
              rect: { x: 0, y: 0, width: 0, height: 0 },
              text: { html: "", markdown: "" },
              shape: "rect",
            },
            nGrand: {
              id: "nGrand",
              children: ["nParent"],
              rect: { x: 300, y: 220, width: 120, height: 120 },
              text: { html: "Grand", markdown: "Grand" },
              shape: "rect",
            },
            nParent: {
              id: "nParent",
              children: [],
              rect: { x: 20, y: 20, width: 80, height: 80 },
              text: { html: "Parent", markdown: "Parent" },
              shape: "rect",
            },
            nDragged: {
              id: "nDragged",
              children: [],
              rect: { x: 80, y: 240, width: 140, height: 140 },
              text: { html: "Dragged", markdown: "Dragged" },
              shape: "rect",
            },
          },
          edges: {},
        }),
      )
    })
    await page.goto("/")

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
      .poll(async () =>
        page.evaluate(() => {
          const graph = JSON.parse(
            localStorage.getItem("g-drop-expands-nested-parents")!,
          )

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
          labelMeasure.innerHTML = graph.nodes.nParent.text.html
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
        }),
      )
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

  test("restores foreign text when escaping portal editor", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const graphID = "g-portal-editor-escape"
      localStorage.setItem("last-graph", graphID)
      localStorage.setItem(
        "graph-list",
        JSON.stringify({
          [graphID]: { title: "Portal editor escape", lastModifiedMs: 0 },
        }),
      )
      localStorage.setItem(
        graphID,
        JSON.stringify({
          nodes: {
            nRoot: {
              id: "nRoot",
              children: ["nEscape"],
              rect: { x: 0, y: 0, width: 0, height: 0 },
              text: { html: "", markdown: "" },
              shape: "rect",
            },
            nEscape: {
              id: "nEscape",
              children: [],
              rect: { x: 180, y: 160, width: 260, height: 180 },
              text: {
                html: "<h1>Original</h1>",
                markdown: "# Original",
              },
              shape: "rect",
            },
          },
          edges: {},
        }),
      )
    })
    await page.goto("/")

    const nodeShape = page.locator(
      "[data-nodeID=nEscape] [data-dragID=node] > rect",
    )
    const nodeBox = await nodeShape.boundingBox()
    if (!nodeBox) throw new Error("Missing node box")

    await page.mouse.dblclick(
      nodeBox.x + nodeBox.width / 2,
      nodeBox.y + nodeBox.height / 2,
    )

    const editor = page.locator("[data-testid=foreign-text-editor]")
    await expect(editor).toBeFocused()
    await editor.fill("# Dirty")
    await page.keyboard.press("Escape")

    await expect(editor).toHaveCount(0)
    await expect(
      page.locator("[data-nodeID=nEscape] [data-testid=foreign-text-content]"),
    ).toHaveText("Original")

    const storedMarkdown = await page.evaluate(() => {
      const graph = JSON.parse(localStorage.getItem("g-portal-editor-escape")!)

      return graph.nodes.nEscape.text.markdown
    })
    expect(storedMarkdown).toEqual("# Original")
  })

  test("double-clicking active foreign text editor selects a word instead of adding a node", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const graphID = "g-portal-editor-word-select"
      localStorage.setItem("last-graph", graphID)
      localStorage.setItem(
        "graph-list",
        JSON.stringify({
          [graphID]: { title: "Portal editor word select", lastModifiedMs: 0 },
        }),
      )
      localStorage.setItem(
        graphID,
        JSON.stringify({
          nodes: {
            nRoot: {
              id: "nRoot",
              children: ["nWord"],
              rect: { x: 0, y: 0, width: 0, height: 0 },
              text: { html: "", markdown: "" },
              shape: "rect",
            },
            nWord: {
              id: "nWord",
              children: [],
              rect: { x: 180, y: 160, width: 280, height: 140 },
              text: {
                html: "<p>alpha beta gamma</p>",
                markdown: "alpha beta gamma",
              },
              shape: "rect",
            },
          },
          edges: {},
        }),
      )
    })
    await page.goto("/")

    const nodeShape = page.locator(
      "[data-nodeID=nWord] [data-dragID=node] > rect",
    )
    const nodeBox = await nodeShape.boundingBox()
    if (!nodeBox) throw new Error("Missing node box")

    await page.mouse.dblclick(
      nodeBox.x + nodeBox.width / 2,
      nodeBox.y + nodeBox.height / 2,
    )

    const editor = page.locator("[data-testid=foreign-text-editor]")
    await expect(editor).toBeFocused()
    await expect(page.locator("[data-nodeID]")).toHaveCount(1)

    const editorBox = await editor.boundingBox()
    if (!editorBox) throw new Error("Missing editor box")

    await page.mouse.dblclick(editorBox.x + 64, editorBox.y + 20)

    await expect(editor).toBeFocused()
    await expect(page.locator("[data-nodeID]")).toHaveCount(1)
    await expect
      .poll(async () =>
        editor.evaluate(textarea => {
          if (!(textarea instanceof HTMLTextAreaElement)) {
            throw new Error("Missing textarea")
          }

          return textarea.value.slice(
            textarea.selectionStart,
            textarea.selectionEnd,
          )
        }),
      )
      .toEqual("beta")
  })

  test("highlights markdown bullets and backtick markers in active foreign text editor", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const graphID = "g-portal-editor-marker-highlight"
      localStorage.setItem("last-graph", graphID)
      localStorage.setItem(
        "graph-list",
        JSON.stringify({
          [graphID]: {
            title: "Portal editor marker highlight",
            lastModifiedMs: 0,
          },
        }),
      )
      localStorage.setItem(
        graphID,
        JSON.stringify({
          nodes: {
            nRoot: {
              id: "nRoot",
              children: ["nMarkers"],
              rect: { x: 0, y: 0, width: 0, height: 0 },
              text: { html: "", markdown: "" },
              shape: "rect",
            },
            nMarkers: {
              id: "nMarkers",
              children: [],
              rect: { x: 120, y: 140, width: 480, height: 180 },
              text: {
                html: "<ul><li>GET <code>sku_id</code> -&gt; <code>product_json</code></li><li>GET <code>[]sku_id</code> -&gt; <code>[]product_json</code></li></ul>",
                markdown:
                  "- GET `sku_id` -> `product_json`\n- GET `[]sku_id` -> `[]product_json`",
              },
              shape: "rect",
            },
          },
          edges: {},
        }),
      )
    })
    await page.goto("/")

    const nodeBox = await page
      .locator("[data-nodeID=nMarkers] [data-dragID=node] > rect")
      .boundingBox()
    if (!nodeBox) throw new Error("Missing node box")

    await page.mouse.dblclick(
      nodeBox.x + nodeBox.width / 2,
      nodeBox.y + nodeBox.height / 2,
    )

    const highlighter = page.locator(
      "[data-testid=markdown-editor-highlighter]",
    )
    await expect(highlighter).toContainText(
      "- GET `sku_id` -> `product_json`\n- GET `[]sku_id` -> `[]product_json`",
    )

    const markerCounts = await highlighter.evaluate(pre => {
      const spans = Array.from(pre.querySelectorAll("span"))

      return {
        backticks: spans.filter(span => span.textContent === "`").length,
        bullets: spans.filter(span => span.textContent === "-").length,
      }
    })

    expect(markerCounts).toEqual({ backticks: 8, bullets: 2 })
  })

  test("keeps portal text editor locked to node while panning", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chrome",
      "mouse.wheel is not supported in mobile WebKit",
    )

    await page.addInitScript(() => {
      const graphID = "g-portal-editor-pan"
      localStorage.setItem("last-graph", graphID)
      localStorage.setItem(
        "graph-list",
        JSON.stringify({
          [graphID]: { title: "Portal editor pan", lastModifiedMs: 0 },
        }),
      )
      localStorage.setItem(
        graphID,
        JSON.stringify({
          nodes: {
            nRoot: {
              id: "nRoot",
              children: ["nPan"],
              rect: { x: 0, y: 0, width: 0, height: 0 },
              text: { html: "", markdown: "" },
              shape: "rect",
            },
            nPan: {
              id: "nPan",
              children: [],
              rect: { x: 220, y: 180, width: 220, height: 140 },
              text: {
                html: "<p>Editable during pan</p>",
                markdown: "Editable during pan",
              },
              shape: "rect",
            },
          },
          edges: {},
        }),
      )
    })
    await page.goto("/")

    const nodeShape = page.locator(
      "[data-nodeID=nPan] [data-dragID=node] > rect",
    )
    const nodeBox = await nodeShape.boundingBox()
    if (!nodeBox) throw new Error("Missing node box")

    await page.mouse.dblclick(
      nodeBox.x + nodeBox.width / 2,
      nodeBox.y + nodeBox.height / 2,
    )

    const editor = page.locator("[data-testid=foreign-text-editor]")
    await expect(editor).toBeFocused()

    async function editorAlignment(): Promise<{
      dx: number
      dy: number
      heightDelta: number
      nodeX: number
      widthDelta: number
    }> {
      const shape = await nodeShape.boundingBox()
      const textarea = await editor.boundingBox()
      if (!shape || !textarea) throw new Error("Missing alignment boxes")

      return {
        dx: textarea.x - shape.x,
        dy: textarea.y - shape.y,
        heightDelta: textarea.height - shape.height,
        nodeX: shape.x,
        widthDelta: textarea.width - shape.width,
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

    await page.addInitScript(() => {
      const graphID = "g-portal-editor-zoom"
      localStorage.setItem("last-graph", graphID)
      localStorage.setItem(
        "graph-list",
        JSON.stringify({
          [graphID]: { title: "Portal editor zoom", lastModifiedMs: 0 },
        }),
      )
      localStorage.setItem(
        graphID,
        JSON.stringify({
          nodes: {
            nRoot: {
              id: "nRoot",
              children: ["nZoom"],
              rect: { x: 0, y: 0, width: 0, height: 0 },
              text: { html: "", markdown: "" },
              shape: "rect",
            },
            nZoom: {
              id: "nZoom",
              children: [],
              rect: { x: 220, y: 180, width: 220, height: 140 },
              text: {
                html: "<p>###</p><p># h4</p>",
                markdown: "###\n# h4",
              },
              shape: "rect",
            },
          },
          edges: {},
        }),
      )
    })
    await page.goto("/")

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

    const nodeShape = page.locator(
      "[data-nodeID=nZoom] [data-dragID=node] > rect",
    )
    const nodeBox = await nodeShape.boundingBox()
    if (!nodeBox) throw new Error("Missing node box")

    await page.mouse.dblclick(
      nodeBox.x + nodeBox.width / 2,
      nodeBox.y + nodeBox.height / 2,
    )

    const editor = page.locator("[data-testid=foreign-text-editor]")
    await expect(editor).toBeFocused()

    await page.mouse.move(700, 500)
    await page.keyboard.down("Control")
    await page.mouse.wheel(0, -400)
    await page.keyboard.up("Control")

    await expect.poll(canvasScale).toBeGreaterThan(1)
    const scale = await canvasScale()

    const metrics = await editor.evaluate(textarea => {
      const style = getComputedStyle(textarea)
      const rect = textarea.getBoundingClientRect()

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
    await page.addInitScript(() => {
      const graphID = "g-portal-editor-pinch-forward"
      localStorage.setItem("last-graph", graphID)
      localStorage.setItem(
        "graph-list",
        JSON.stringify({
          [graphID]: { title: "Portal editor pinch", lastModifiedMs: 0 },
        }),
      )
      localStorage.setItem(
        graphID,
        JSON.stringify({
          nodes: {
            nRoot: {
              id: "nRoot",
              children: ["nPinch"],
              rect: { x: 0, y: 0, width: 0, height: 0 },
              text: { html: "", markdown: "" },
              shape: "rect",
            },
            nPinch: {
              id: "nPinch",
              children: [],
              rect: { x: 200, y: 180, width: 240, height: 160 },
              text: {
                html: "<p>Pinch while editing</p>",
                markdown: "Pinch while editing",
              },
              shape: "rect",
            },
          },
          edges: {},
        }),
      )
    })
    await page.goto("/")

    const nodeShape = page.locator(
      "[data-nodeID=nPinch] [data-dragID=node] > rect",
    )
    const nodeBox = await nodeShape.boundingBox()
    if (!nodeBox) throw new Error("Missing node box")

    await page.mouse.dblclick(
      nodeBox.x + nodeBox.width / 2,
      nodeBox.y + nodeBox.height / 2,
    )

    const editor = page.locator("[data-testid=foreign-text-editor]")
    await expect(editor).toBeFocused()
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
    await page.addInitScript(() => {
      const graphID = "g-portal-editor-title-layer"
      localStorage.setItem("last-graph", graphID)
      localStorage.setItem(
        "graph-list",
        JSON.stringify({
          [graphID]: { title: "Portal title layer", lastModifiedMs: 0 },
        }),
      )
      localStorage.setItem(
        graphID,
        JSON.stringify({
          nodes: {
            nRoot: {
              id: "nRoot",
              children: ["nTitleLayer"],
              rect: { x: 0, y: 0, width: 0, height: 0 },
              text: { html: "", markdown: "" },
              shape: "rect",
            },
            nTitleLayer: {
              id: "nTitleLayer",
              children: [],
              rect: { x: 0, y: 0, width: 760, height: 180 },
              text: {
                html: "<h4>h4</h4>",
                markdown: "#### h4",
              },
              shape: "rect",
            },
          },
          edges: {},
        }),
      )
    })
    await page.goto("/")

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
      const textarea = document.querySelector(
        "[data-testid=foreign-text-editor]",
      )

      if (!(title instanceof HTMLElement)) throw new Error("Missing title")
      if (!(textarea instanceof HTMLTextAreaElement)) {
        throw new Error("Missing editor")
      }

      const titleRect = title.getBoundingClientRect()
      const textareaRect = textarea.getBoundingClientRect()
      const x = titleRect.left + titleRect.width / 2
      const y = titleRect.top + titleRect.height / 2
      const top = document.elementFromPoint(x, y)

      return {
        pointInsideEditor:
          x >= textareaRect.left &&
          x <= textareaRect.right &&
          y >= textareaRect.top &&
          y <= textareaRect.bottom,
        topIsEditor: top === textarea || textarea.contains(top),
        topIsTitle: top === title || title.contains(top),
      }
    })

    expect(layer.pointInsideEditor).toEqual(true)
    expect(layer.topIsEditor).toEqual(false)
    expect(layer.topIsTitle).toEqual(true)
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
