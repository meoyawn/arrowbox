import { expect, test, type Page } from "@playwright/test"

const loadHarness = async (page: Page): Promise<void> => {
  await page.goto("/")
  await page.setContent("<main></main>")
}

test.describe("markdown", () => {
  test("external", async ({ page }) => {
    await loadHarness(page)

    const html = await page.evaluate<string>(async () => {
      const modulePath = "/src/app/markdown.ts"
      const { md2html } = await import(modulePath)
      return md2html(`[example](https://example.com)`)
    })

    expect(html).toEqual(
      `<p><a href="https://example.com" rel="nofollow" target="_blank">example</a></p>\n`,
    )
  })

  test("internal", async ({ page }) => {
    await loadHarness(page)

    const html = await page.evaluate<[string, string]>(async () => {
      const modulePath = "/src/app/markdown.ts"
      const { md2html } = await import(modulePath)
      return [md2html(`[example](#example)`), md2html(`[example](/example)`)]
    })

    expect(html).toEqual([
      `<p><a href="#example">example</a></p>\n`,
      `<p><a href="/example">example</a></p>\n`,
    ])
  })
})
