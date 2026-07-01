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

interface BrushRectMetrics {
  height: number
  width: number
}

interface ScreenRect {
  bottom: number
  height: number
  left: number
  right: number
  top: number
  width: number
}

interface WorldRect {
  height: number
  width: number
  x: number
  y: number
}

async function mockVisualViewport(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const listeners = new Map<string, Set<EventListener>>()
    const viewport = {
      offsetTop: 44,
      height: 590,
      addEventListener: (type: string, listener: EventListener) => {
        listeners.set(type, (listeners.get(type) ?? new Set()).add(listener))
      },
      removeEventListener: (type: string, listener: EventListener) => {
        listeners.get(type)?.delete(listener)
      },
    }

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 844,
    })
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    })
  })
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

async function dispatchCanvasTouch(
  page: Page,
  type: string,
  points: Array<TouchPoint>,
): Promise<void> {
  await page.evaluate(
    ({ points, type }) => {
      const canvas = document.querySelector("#canvas")
      if (!canvas) throw new Error("No canvas")

      const touchList = points.map(({ id, x, y }) => ({
        clientX: x,
        clientY: y,
        identifier: id,
        pageX: x,
        pageY: y,
        screenX: x,
        screenY: y,
        target: canvas,
      }))

      Object.defineProperty(touchList, "item", {
        value: (index: number) => touchList[index] ?? null,
      })

      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperty(event, "touches", { value: touchList })
      Object.defineProperty(event, "changedTouches", { value: touchList })
      canvas.dispatchEvent(event)
    },
    { points, type },
  )
}

async function installManualAnimationFrame(page: Page): Promise<void> {
  await page.evaluate(() => {
    let nextFrameID = 1
    const callbacks = new Map<number, FrameRequestCallback>()

    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: (callback: FrameRequestCallback): number => {
        const id = nextFrameID
        nextFrameID += 1
        callbacks.set(id, callback)

        return id
      },
    })
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      value: (id: number): void => {
        callbacks.delete(id)
      },
    })
    Object.defineProperty(window, "__arrowboxStepFrame", {
      configurable: true,
      value: (): number => {
        const frameCallbacks = [...callbacks.entries()]
        callbacks.clear()

        for (const entry of frameCallbacks) {
          entry[1](performance.now())
        }

        return frameCallbacks.length
      },
    })
  })
}

async function stepManualAnimationFrame(page: Page): Promise<number> {
  return page.evaluate(() =>
    (
      window as unknown as { __arrowboxStepFrame: () => number }
    ).__arrowboxStepFrame(),
  )
}

async function waitForCameraChange(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const transform = document
      .querySelector("#canvas > g")
      ?.getAttribute("transform")

    return transform !== "translate(0 0) scale(1)"
  })
}

async function brushRect(page: Page): Promise<BrushRectMetrics> {
  return page.locator('#canvas > g > rect[fill="#0000FF80"]').evaluate(rect => {
    const box = rect.getBoundingClientRect()
    return {
      height: box.height,
      width: box.width,
    }
  })
}

function screenRectFromWorld(
  rect: WorldRect,
  camera: CameraTransform,
): ScreenRect {
  const left = rect.x * camera.k + camera.x
  const top = rect.y * camera.k + camera.y
  const width = rect.width * camera.k
  const height = rect.height * camera.k

  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
  }
}

function expectRectsClose(actual: ScreenRect, expected: ScreenRect): void {
  expect(Math.abs(actual.left - expected.left)).toBeLessThanOrEqual(3)
  expect(Math.abs(actual.top - expected.top)).toBeLessThanOrEqual(3)
  expect(Math.abs(actual.width - expected.width)).toBeLessThanOrEqual(3)
  expect(Math.abs(actual.height - expected.height)).toBeLessThanOrEqual(3)
}

function rectsOverlap(a: ScreenRect, b: ScreenRect): boolean {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  )
}

test.describe("diagram page iOS viewport", () => {
  test("keeps chrome controls inside the visual viewport", async ({ page }) => {
    await mockVisualViewport(page)
    await page.goto("/")

    const metrics = await page.evaluate(() => {
      const menu = document
        .querySelector("[data-testid=diagram-menu-link]")
        ?.getBoundingClientRect()
      const controls = document
        .querySelector("[data-testid=diagram-bottom-controls]")
        ?.getBoundingClientRect()

      return {
        bottomInset:
          innerHeight -
          (visualViewport?.height ?? innerHeight) -
          (visualViewport?.offsetTop ?? 0),
        controlsBottom: controls
          ? document.documentElement.clientHeight - controls.bottom
          : 0,
        menuY: menu?.y ?? 0,
        topOffset: visualViewport?.offsetTop ?? 0,
      }
    })

    expect(metrics.menuY).toBeGreaterThanOrEqual(metrics.topOffset + 8)
    expect(metrics.controlsBottom).toBeGreaterThanOrEqual(
      metrics.bottomInset + 8,
    )
  })
})

test.describe("diagram page iOS gestures", () => {
  test("brushes empty canvas with one finger", async ({ page }) => {
    await page.goto("/")

    await dispatchCanvasTouch(page, "touchstart", [{ id: 1, x: 120, y: 300 }])
    await dispatchCanvasTouch(page, "touchmove", [{ id: 1, x: 200, y: 350 }])
    await expect(
      page.locator('#canvas > g > rect[fill="#0000FF80"]'),
    ).toHaveCount(1)

    const camera = await cameraTransform(page)
    const brush = await brushRect(page)
    const expectedCamera: CameraTransform = { x: 0, y: 0, k: 1 }

    expect(camera).toEqual(expectedCamera)
    expect(brush.width).toBeGreaterThan(60)
    expect(brush.height).toBeGreaterThan(30)
  })

  test("highlights a node while another node is dragged over it", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const graphID = "g-ios-drag-hover-highlight"
      localStorage.setItem("last-graph", graphID)
      localStorage.setItem(
        "graph-list",
        JSON.stringify({
          [graphID]: { title: "Drag hover highlight", lastModifiedMs: 0 },
        }),
      )
      localStorage.setItem(
        graphID,
        JSON.stringify({
          nodes: {
            nRoot: {
              id: "nRoot",
              children: ["nDropTarget", "nDragged"],
              rect: { x: 0, y: 0, width: 0, height: 0 },
              text: { html: "", markdown: "" },
              shape: "rect",
            },
            nDropTarget: {
              id: "nDropTarget",
              children: [],
              rect: { x: 210, y: 260, width: 110, height: 90 },
              text: {
                html: "<p>Target</p>",
                markdown: "Target",
              },
              shape: "rect",
            },
            nDragged: {
              id: "nDragged",
              children: [],
              rect: { x: 60, y: 260, width: 100, height: 80 },
              text: {
                html: "<p>Drag</p>",
                markdown: "Drag",
              },
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
    const targetShape = page.locator(
      "[data-nodeID=nDropTarget] [data-dragID=node] > rect",
    )
    const draggedBox = await draggedShape.boundingBox()
    const targetBox = await targetShape.boundingBox()
    if (!draggedBox || !targetBox) throw new Error("Missing node boxes")

    async function targetStroke(): Promise<{
      hasBlueStroke: boolean
      strokeWidth: string
    }> {
      return targetShape.evaluate(rect => {
        const style = getComputedStyle(rect)

        return {
          hasBlueStroke: rect.classList.contains("stroke-blue-600"),
          strokeWidth: style.strokeWidth,
        }
      })
    }

    await page.mouse.move(
      draggedBox.x + draggedBox.width / 2,
      draggedBox.y + draggedBox.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
      { steps: 6 },
    )

    await expect.poll(targetStroke).toEqual({
      hasBlueStroke: true,
      strokeWidth: "2px",
    })

    await page.mouse.up()
  })

  test("pans empty canvas with two fingers", async ({ page }) => {
    await page.goto("/")

    await dispatchCanvasTouch(page, "touchstart", [
      { id: 1, x: 120, y: 320 },
      { id: 2, x: 220, y: 320 },
    ])
    await dispatchCanvasTouch(page, "touchmove", [
      { id: 1, x: 160, y: 350 },
      { id: 2, x: 260, y: 350 },
    ])
    await dispatchCanvasTouch(page, "touchend", [])
    await waitForCameraChange(page)

    const camera = await cameraTransform(page)
    expect(camera.x).toBeGreaterThan(30)
    expect(camera.y).toBeGreaterThan(20)
    expect(camera.k).toEqual(1)
  })

  test("keeps foreign text locked to transformed nodes while panning", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const graphID = "g-ios-foreign-text-transform"
      localStorage.setItem("last-graph", graphID)
      localStorage.setItem(
        "graph-list",
        JSON.stringify({
          [graphID]: { title: "Foreign text transform", lastModifiedMs: 0 },
        }),
      )
      localStorage.setItem(
        graphID,
        JSON.stringify({
          nodes: {
            nRoot: {
              id: "nRoot",
              children: ["nLag"],
              rect: { x: 0, y: 0, width: 0, height: 0 },
              text: { html: "", markdown: "" },
              shape: "rect",
            },
            nLag: {
              id: "nLag",
              children: [],
              rect: { x: 120, y: 300, width: 140, height: 80 },
              text: {
                html: "<p>Lagging label</p>",
                markdown: "Lagging label",
              },
              shape: "rect",
            },
          },
          edges: {},
        }),
      )
    })
    await page.goto("/")

    async function foreignTextAlignment(): Promise<{
      contentHeight: number
      contentWidth: number
      dx: number
      dy: number
      position: string
    }> {
      return page.locator("[data-nodeID=nLag]").evaluate(node => {
        const shape = node.querySelector("rect")
        const text = node.querySelector("[data-testid=foreign-text-content]")
        if (!shape || !text) throw new Error("Missing node text")

        const shapeRect = shape.getBoundingClientRect()
        const textRect = text.getBoundingClientRect()

        return {
          contentHeight: textRect.height,
          contentWidth: textRect.width,
          dx:
            textRect.left +
            textRect.width / 2 -
            (shapeRect.left + shapeRect.width / 2),
          dy:
            textRect.top +
            textRect.height / 2 -
            (shapeRect.top + shapeRect.height / 2),
          position: getComputedStyle(text).position,
        }
      })
    }

    await dispatchCanvasTouch(page, "touchstart", [
      { id: 1, x: 120, y: 320 },
      { id: 2, x: 220, y: 320 },
    ])
    await dispatchCanvasTouch(page, "touchmove", [
      { id: 1, x: 190, y: 365 },
      { id: 2, x: 290, y: 365 },
    ])
    await waitForCameraChange(page)

    const alignment = await foreignTextAlignment()
    expect(alignment.position).not.toEqual("fixed")
    expect(alignment.contentWidth).toBeGreaterThan(0)
    expect(alignment.contentHeight).toBeGreaterThan(0)
    expect(Math.abs(alignment.dx)).toBeLessThan(1)
    expect(Math.abs(alignment.dy)).toBeLessThan(1)
  })

  test("keeps foreign text inside node bounds on first paint", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const graphID = "g-ios-foreign-text-contained"
      localStorage.setItem("last-graph", graphID)
      localStorage.setItem(
        "graph-list",
        JSON.stringify({
          [graphID]: { title: "Foreign text contained", lastModifiedMs: 0 },
        }),
      )
      localStorage.setItem(
        graphID,
        JSON.stringify({
          nodes: {
            nRoot: {
              id: "nRoot",
              children: ["nContained"],
              rect: { x: 0, y: 0, width: 0, height: 0 },
              text: { html: "", markdown: "" },
              shape: "rect",
            },
            nContained: {
              id: "nContained",
              children: [],
              rect: { x: 90, y: 260, width: 140, height: 90 },
              text: {
                html: "<p>Hihhhih</p>",
                markdown: "Hihhhih",
              },
              shape: "rect",
            },
          },
          edges: {},
        }),
      )
    })
    await page.goto("/")

    const metrics = await page
      .locator("[data-nodeID=nContained]")
      .evaluate(node => {
        const shape = node.querySelector("rect")
        const text = node.querySelector("[data-testid=foreign-text-content]")
        const textBox = node.querySelector("[data-testid=foreign-text-box]")
        if (!shape || !text || !textBox) throw new Error("Missing node text")

        const shapeRect = shape.getBoundingClientRect()
        const textRect = text.getBoundingClientRect()

        return {
          boxOverflow: getComputedStyle(textBox).overflow,
          contentPosition: getComputedStyle(text).position,
          shapeBottom: shapeRect.bottom,
          shapeLeft: shapeRect.left,
          shapeRight: shapeRect.right,
          shapeTop: shapeRect.top,
          textBottom: textRect.bottom,
          textLeft: textRect.left,
          textRight: textRect.right,
          textTop: textRect.top,
        }
      })

    expect(metrics.boxOverflow).toEqual("hidden")
    expect(metrics.contentPosition).toEqual("static")
    expect(metrics.textLeft).toBeGreaterThanOrEqual(metrics.shapeLeft)
    expect(metrics.textTop).toBeGreaterThanOrEqual(metrics.shapeTop)
    expect(metrics.textRight).toBeLessThanOrEqual(metrics.shapeRight)
    expect(metrics.textBottom).toBeLessThanOrEqual(metrics.shapeBottom)
  })

  test("edits foreign text with native iOS textarea outside SVG", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const graphID = "g-ios-foreign-text-edit-caret"
      localStorage.setItem("last-graph", graphID)
      localStorage.setItem(
        "graph-list",
        JSON.stringify({
          [graphID]: { title: "Foreign text edit caret", lastModifiedMs: 0 },
        }),
      )
      localStorage.setItem(
        graphID,
        JSON.stringify({
          nodes: {
            nRoot: {
              id: "nRoot",
              children: ["nEdit"],
              rect: { x: 0, y: 0, width: 0, height: 0 },
              text: { html: "", markdown: "" },
              shape: "rect",
            },
            nEdit: {
              id: "nEdit",
              children: [],
              rect: { x: 100, y: 260, width: 180, height: 120 },
              text: {
                html: "<p>Edit me</p>",
                markdown: "Edit me",
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
      .locator("[data-nodeID=nEdit] [data-dragID=node] > rect")
      .boundingBox()
    if (!nodeBox) throw new Error("Missing node box")

    await page.mouse.dblclick(
      nodeBox.x + nodeBox.width / 2,
      nodeBox.y + nodeBox.height / 2,
    )

    const textarea = page.locator("[data-testid=foreign-text-editor]")
    await expect(textarea).toBeVisible()
    await expect(textarea).toBeFocused()

    await textarea.press("End")
    await textarea.pressSequentially("!")
    await expect(textarea).toHaveValue("Edit me!")

    const metrics = await textarea.evaluate(textarea => {
      const rect = textarea.getBoundingClientRect()
      const style = getComputedStyle(textarea)
      return {
        borderColor: style.borderTopColor,
        borderStyle: style.borderTopStyle,
        borderWidth: style.borderTopWidth,
        bottom: rect.bottom,
        height: rect.height,
        insideEditorLayer: Boolean(
          textarea.closest("[data-testid=foreign-text-editor-layer]"),
        ),
        insideSvg: Boolean(textarea.closest("svg")),
        left: rect.left,
        position: style.position,
        textColor: style.color,
        top: rect.top,
        width: rect.width,
      }
    })

    expect(metrics.insideEditorLayer).toEqual(true)
    expect(metrics.insideSvg).toEqual(false)
    expect(metrics.position).toEqual("absolute")
    expect(metrics.borderColor).toEqual("rgb(24, 24, 27)")
    expect(metrics.borderStyle).toEqual("solid")
    expect(metrics.borderWidth).toEqual("2px")
    expect(metrics.textColor).toEqual("rgb(0, 0, 0)")
    expect(Math.abs(metrics.left - nodeBox.x)).toBeLessThan(2)
    expect(Math.abs(metrics.top - nodeBox.y)).toBeLessThan(2)
    expect(Math.abs(metrics.width - nodeBox.width)).toBeLessThan(2)
    expect(Math.abs(metrics.height - nodeBox.height)).toBeLessThan(2)
  })

  test("keeps active foreign text editor locked during touch pan and pinch", async ({
    page,
  }) => {
    const editedRect: WorldRect = { x: 120, y: 300, width: 170, height: 110 }
    const siblingRects: Array<WorldRect> = [
      { x: 36, y: 292, width: 72, height: 132 },
      { x: 308, y: 298, width: 112, height: 128 },
    ]

    await page.addInitScript(() => {
      const graphID = "g-ios-foreign-text-edit-transform"
      localStorage.setItem("last-graph", graphID)
      localStorage.setItem(
        "graph-list",
        JSON.stringify({
          [graphID]: {
            title: "Foreign text edit transform",
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
              children: ["nSiblingLeft", "nEditTransform", "nSiblingRight"],
              rect: { x: 0, y: 0, width: 0, height: 0 },
              text: { html: "", markdown: "" },
              shape: "rect",
            },
            nSiblingLeft: {
              id: "nSiblingLeft",
              children: [],
              rect: { x: 36, y: 292, width: 72, height: 132 },
              text: {
                html: "<p>Near left</p>",
                markdown: "Near left",
              },
              shape: "rect",
            },
            nEditTransform: {
              id: "nEditTransform",
              children: [],
              rect: { x: 120, y: 300, width: 170, height: 110 },
              text: {
                html: "<p>Move while editing</p>",
                markdown: "Move while editing",
              },
              shape: "rect",
            },
            nSiblingRight: {
              id: "nSiblingRight",
              children: [],
              rect: { x: 308, y: 298, width: 112, height: 128 },
              text: {
                html: "<p>Near right</p>",
                markdown: "Near right",
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
      "[data-nodeID=nEditTransform] [data-dragID=node] > rect",
    )
    const nodeBox = await nodeShape.boundingBox()
    if (!nodeBox) throw new Error("Missing node box")

    await page.mouse.dblclick(
      nodeBox.x + nodeBox.width / 2,
      nodeBox.y + nodeBox.height / 2,
    )

    const editor = page.locator("[data-testid=foreign-text-editor]")
    await expect(editor).toBeFocused()

    async function editorRect(): Promise<ScreenRect> {
      const textarea = await editor.boundingBox()
      if (!textarea) throw new Error("Missing editor box")

      return {
        bottom: textarea.y + textarea.height,
        height: textarea.height,
        left: textarea.x,
        right: textarea.x + textarea.width,
        top: textarea.y,
        width: textarea.width,
      }
    }

    async function expectedEditorRect(): Promise<ScreenRect> {
      return screenRectFromWorld(editedRect, await cameraTransform(page))
    }

    async function expectEditorLocked(): Promise<void> {
      expectRectsClose(await editorRect(), await expectedEditorRect())
    }

    const editorLayer = await editor.evaluate(textarea => ({
      insideEditorLayer: Boolean(
        textarea.closest("[data-testid=foreign-text-editor-layer]"),
      ),
      insideSvg: Boolean(textarea.closest("svg")),
      position: getComputedStyle(textarea).position,
    }))

    expect(editorLayer.insideEditorLayer).toEqual(true)
    expect(editorLayer.insideSvg).toEqual(false)
    expect(editorLayer.position).toEqual("absolute")

    const before = await expectedEditorRect()
    await expectEditorLocked()

    await installManualAnimationFrame(page)
    await dispatchCanvasTouch(page, "touchstart", [
      { id: 1, x: 130, y: 340 },
      { id: 2, x: 250, y: 340 },
    ])

    for (const points of [
      [
        { id: 1, x: 160, y: 360 },
        { id: 2, x: 310, y: 360 },
      ],
      [
        { id: 1, x: 175, y: 374 },
        { id: 2, x: 330, y: 384 },
      ],
    ]) {
      await dispatchCanvasTouch(page, "touchmove", points)
      expect(await stepManualAnimationFrame(page)).toBeGreaterThan(0)
      await expectEditorLocked()
    }

    const after = await expectedEditorRect()
    expect(after.left).not.toEqual(before.left)
    expect(after.width).toBeGreaterThan(before.width)

    const expectedPaint = await expectedEditorRect()

    for (const sibling of siblingRects) {
      const siblingScreenRect = screenRectFromWorld(
        sibling,
        await cameraTransform(page),
      )

      expect(rectsOverlap(expectedPaint, siblingScreenRect)).toEqual(false)
    }

    await dispatchCanvasTouch(page, "touchend", [])
  })

  test("zooms empty canvas with two-finger pinch", async ({ page }) => {
    await page.goto("/")

    await dispatchCanvasTouch(page, "touchstart", [
      { id: 1, x: 120, y: 320 },
      { id: 2, x: 220, y: 320 },
    ])
    await dispatchCanvasTouch(page, "touchmove", [
      { id: 1, x: 100, y: 310 },
      { id: 2, x: 260, y: 310 },
    ])
    await dispatchCanvasTouch(page, "touchend", [])
    await waitForCameraChange(page)

    const camera = await cameraTransform(page)
    expect(camera.k).toBeGreaterThan(1.4)
    expect(camera.x).toBeLessThan(0)
    expect(camera.y).toBeLessThan(0)
  })
})
