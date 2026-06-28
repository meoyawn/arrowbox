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
    expect(alignment.position).toEqual("static")
    expect(Math.abs(alignment.dx)).toBeLessThan(1)
    expect(Math.abs(alignment.dy)).toBeLessThan(1)
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
