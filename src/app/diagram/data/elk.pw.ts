import { expect, test, type Page } from "@playwright/test"

async function loadHarness(page: Page): Promise<void> {
  await page.goto("/")
  await page.setContent("<main></main>")
  await page.addScriptTag({
    type: "module",
    url: "/src/app/playwright-harness.ts",
  })
}

test.describe("elk", () => {
  test("static harness import", async ({ page }) => {
    await loadHarness(page)

    const id = await page.evaluate(() =>
      window.arrowboxPw.layoutEmptyGraphRootID(),
    )

    expect(id).toEqual("nRoot")
  })
})
