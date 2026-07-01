import { expect, test, type Page } from "@playwright/test"
import { ROOT_ID } from "./data/ROOT_ID.ts"
import { gotoGraphURLFragment } from "./url-fragment-test.ts"

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
    await gotoGraphURLFragment(page, {
      id: "gIosDragHighlight",
      title: "iOS drag highlight",
      nodes: {
        [ROOT_ID]: {
          id: ROOT_ID,
          children: ["nDropTarget", "nDragged"],
          rect: { x: 0, y: 0, width: 0, height: 0 },
          markdown: "",
          shape: "rect",
        },
        nDropTarget: {
          id: "nDropTarget",
          children: [],
          rect: { x: 210, y: 260, width: 110, height: 90 },
          markdown: "Target",
          shape: "rect",
        },
        nDragged: {
          id: "nDragged",
          children: [],
          rect: { x: 60, y: 260, width: 100, height: 80 },
          markdown: "Drag",
          shape: "rect",
        },
      },
      edges: {},
    })

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
    await gotoGraphURLFragment(page, {
      id: "gIosForeignTextPan",
      title: "iOS foreign text pan",
      nodes: {
        [ROOT_ID]: {
          id: ROOT_ID,
          children: ["nLag"],
          rect: { x: 0, y: 0, width: 0, height: 0 },
          markdown: "",
          shape: "rect",
        },
        nLag: {
          id: "nLag",
          children: [],
          rect: { x: 120, y: 300, width: 140, height: 80 },
          markdown: "Lagging label",
          shape: "rect",
        },
      },
      edges: {},
    })

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
    await gotoGraphURLFragment(page, {
      id: "gIosForeignTextBounds",
      title: "iOS foreign text bounds",
      nodes: {
        [ROOT_ID]: {
          id: ROOT_ID,
          children: ["nContained"],
          rect: { x: 0, y: 0, width: 0, height: 0 },
          markdown: "",
          shape: "rect",
        },
        nContained: {
          id: "nContained",
          children: [],
          rect: { x: 90, y: 260, width: 140, height: 90 },
          markdown: "Hihhhih",
          shape: "rect",
        },
      },
      edges: {},
    })

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

  test("edits foreign text with native iOS editor outside SVG", async ({
    page,
  }) => {
    await gotoGraphURLFragment(page, {
      id: "gIosForeignTextEdit",
      title: "iOS foreign text edit",
      nodes: {
        [ROOT_ID]: {
          id: ROOT_ID,
          children: ["nEdit"],
          rect: { x: 0, y: 0, width: 0, height: 0 },
          markdown: "",
          shape: "rect",
        },
        nEdit: {
          id: "nEdit",
          children: [],
          rect: { x: 100, y: 260, width: 180, height: 120 },
          markdown: "Edit me",
          shape: "rect",
        },
      },
      edges: {},
    })

    const nodeBox = await page
      .locator("[data-nodeID=nEdit] [data-dragID=node] > rect")
      .boundingBox()
    if (!nodeBox) throw new Error("Missing node box")

    await page.mouse.dblclick(
      nodeBox.x + nodeBox.width / 2,
      nodeBox.y + nodeBox.height / 2,
    )

    const editor = page.locator("[data-testid=foreign-text-editor]")
    await expect(editor).toBeVisible()
    await expect(editor).toBeFocused()

    await editor.pressSequentially("!")
    await expect(editor).toHaveText("Edit me!")

    const metrics = await editor.evaluate(editor => {
      const overlay = editor.closest("[data-testid=markdown-editor-overlay]")
      if (!(overlay instanceof HTMLElement)) throw new Error("Missing overlay")

      const overlayRect = overlay.getBoundingClientRect()
      const rect = editor.getBoundingClientRect()
      const style = getComputedStyle(editor)
      return {
        borderColor: style.borderTopColor,
        borderStyle: style.borderTopStyle,
        borderWidth: style.borderTopWidth,
        bottom: rect.bottom,
        height: rect.height,
        insideEditorLayer: Boolean(
          editor.closest("[data-testid=foreign-text-editor-layer]"),
        ),
        insideSvg: Boolean(editor.closest("svg")),
        left: rect.left,
        overlayHeight: overlayRect.height,
        overlayLeft: overlayRect.left,
        overlayPosition: getComputedStyle(overlay).position,
        overlayTop: overlayRect.top,
        overlayWidth: overlayRect.width,
        position: style.position,
        textColor: style.color,
        top: rect.top,
        viewportHeight: document.documentElement.clientHeight,
        viewportWidth: document.documentElement.clientWidth,
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
    expect(metrics.overlayPosition).toEqual("fixed")
    expect(metrics.overlayLeft).toEqual(0)
    expect(metrics.overlayTop).toEqual(0)
    expect(metrics.overlayWidth).toEqual(metrics.viewportWidth)
    expect(metrics.overlayHeight).toEqual(metrics.viewportHeight)
    expect(metrics.left).toEqual(0)
    expect(metrics.top).toBeGreaterThan(0)
    expect(metrics.width).toEqual(metrics.viewportWidth)
    expect(metrics.height).toBeLessThan(metrics.viewportHeight)
  })

  test("keeps active foreign text editor fullscreen during touch pan and pinch", async ({
    page,
  }) => {
    await gotoGraphURLFragment(page, {
      id: "gIosForeignTextTransform",
      title: "iOS foreign text transform",
      nodes: {
        [ROOT_ID]: {
          id: ROOT_ID,
          children: ["nSiblingLeft", "nEditTransform", "nSiblingRight"],
          rect: { x: 0, y: 0, width: 0, height: 0 },
          markdown: "",
          shape: "rect",
        },
        nSiblingLeft: {
          id: "nSiblingLeft",
          children: [],
          rect: { x: 36, y: 292, width: 72, height: 132 },
          markdown: "Near left",
          shape: "rect",
        },
        nEditTransform: {
          id: "nEditTransform",
          children: [],
          rect: { x: 120, y: 300, width: 170, height: 110 },
          markdown: "Move while editing",
          shape: "rect",
        },
        nSiblingRight: {
          id: "nSiblingRight",
          children: [],
          rect: { x: 308, y: 298, width: 112, height: 128 },
          markdown: "Near right",
          shape: "rect",
        },
      },
      edges: {},
    })

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

    const editorLayer = await editor.evaluate(editor => {
      const overlay = editor.closest("[data-testid=markdown-editor-overlay]")
      if (!(overlay instanceof HTMLElement)) throw new Error("Missing overlay")

      const rect = overlay.getBoundingClientRect()

      return {
        insideEditorLayer: Boolean(
          editor.closest("[data-testid=foreign-text-editor-layer]"),
        ),
        insideSvg: Boolean(editor.closest("svg")),
        overlayHeight: rect.height,
        overlayLeft: rect.left,
        overlayTop: rect.top,
        overlayWidth: rect.width,
        position: getComputedStyle(editor).position,
        viewportHeight: document.documentElement.clientHeight,
        viewportWidth: document.documentElement.clientWidth,
      }
    })

    expect(editorLayer.insideEditorLayer).toEqual(true)
    expect(editorLayer.insideSvg).toEqual(false)
    expect(editorLayer.position).toEqual("absolute")
    expect(editorLayer.overlayLeft).toEqual(0)
    expect(editorLayer.overlayTop).toEqual(0)
    expect(editorLayer.overlayWidth).toEqual(editorLayer.viewportWidth)
    expect(editorLayer.overlayHeight).toEqual(editorLayer.viewportHeight)

    const before = await cameraTransform(page)

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
      await expect(editor).toBeFocused()
    }

    const after = await cameraTransform(page)
    expect(after.x).not.toEqual(before.x)
    expect(after.k).toBeGreaterThan(before.k)

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
