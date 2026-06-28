import { expect, test, type Page } from "@playwright/test"
import sharp from "sharp"

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
  }, testInfo) => {
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
        insideSvg: Boolean(textarea.closest("svg")),
        left: rect.left,
        position: style.position,
        textColor: style.color,
        top: rect.top,
        width: rect.width,
      }
    })

    expect(metrics.insideSvg).toEqual(false)
    expect(metrics.position).toEqual("fixed")
    expect(metrics.borderColor).toEqual("rgb(37, 99, 235)")
    expect(metrics.borderStyle).toEqual("solid")
    expect(metrics.borderWidth).toEqual("2px")
    expect(metrics.textColor).toEqual("rgb(0, 0, 0)")
    expect(Math.abs(metrics.left - nodeBox.x)).toBeLessThan(2)
    expect(Math.abs(metrics.top - nodeBox.y)).toBeLessThan(2)
    expect(Math.abs(metrics.width - nodeBox.width)).toBeLessThan(2)
    expect(Math.abs(metrics.height - nodeBox.height)).toBeLessThan(2)

    const editingScreenshotPath = testInfo.outputPath("foreign-text-editor.png")
    const editingScreenshot = await textarea.screenshot({
      path: editingScreenshotPath,
    })
    await testInfo.attach("foreign-text-editor-editing", {
      path: editingScreenshotPath,
      contentType: "image/png",
    })

    async function decodePng(buffer: Buffer): Promise<{
      data: Buffer
      height: number
      width: number
    }> {
      const {
        data,
        info: { height, width },
      } = await sharp(buffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

      return { data, height, width }
    }

    function countPixels(
      image: { data: Buffer; width: number },
      rect: { height: number; left: number; top: number; width: number },
      predicate: (r: number, g: number, b: number, a: number) => boolean,
    ): number {
      let count = 0
      for (let y = rect.top; y < rect.top + rect.height; y++) {
        for (let x = rect.left; x < rect.left + rect.width; x++) {
          const offset = (y * image.width + x) * 4
          if (
            predicate(
              image.data[offset] ?? 0,
              image.data[offset + 1] ?? 0,
              image.data[offset + 2] ?? 0,
              image.data[offset + 3] ?? 0,
            )
          ) {
            count++
          }
        }
      }

      return count
    }

    function isPaintedBlue(
      r: number,
      g: number,
      b: number,
      a: number,
    ): boolean {
      return a > 220 && r < 100 && g > 40 && g < 170 && b > 150
    }

    function isPaintedBlack(
      r: number,
      g: number,
      b: number,
      a: number,
    ): boolean {
      return a > 220 && r < 50 && g < 50 && b < 50
    }

    const image = await decodePng(editingScreenshot)
    const borderPixels = countPixels(
      image,
      { height: image.height, left: 0, top: 0, width: image.width },
      isPaintedBlue,
    )
    const textPixels = countPixels(
      image,
      {
        height: Math.max(1, Math.floor(image.height / 3)),
        left: 0,
        top: 0,
        width: image.width,
      },
      isPaintedBlack,
    )

    expect(borderPixels).toBeGreaterThan(100)
    expect(textPixels).toBeGreaterThan(100)
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
