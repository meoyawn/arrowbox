import { expect, test, type Page } from "@playwright/test"

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
  test("keeps shortcut dialog above its overlay", async ({ page }) => {
    await page.goto("/")

    const helpButton = page.getByRole("button", { exact: true, name: "?" })

    for (let i = 0; i < 5; i++) {
      await helpButton.click()
      await expect(
        page.getByText("Keyboard shortcuts", { exact: true }),
      ).toBeVisible()
      await expectDialogAboveOverlay(page)
      await page.keyboard.press("Escape")
      await expect(
        page.getByText("Keyboard shortcuts", { exact: true }),
      ).toBeHidden()
    }
  })
})
