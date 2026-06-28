import { expect, test, type Page } from "@playwright/test"

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
