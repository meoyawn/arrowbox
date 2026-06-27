import { expect, test, type Page } from "@playwright/test"

const loadHarness = async (page: Page): Promise<void> => {
  await page.goto("/")
  await page.setContent("<main></main>")
}

test.describe("elk", () => {
  test("dynamic import", async ({ page }) => {
    await loadHarness(page)

    const id = await page.evaluate<string>(async () => {
      const elkPath = "/src/app/diagram/data/elk.ts"
      const rootPath = "/src/app/diagram/data/ROOT_ID.ts"
      const dataPath = "/src/app/diagram/data/data.ts"
      const { layoutGraph } = await import(elkPath)
      const { ROOT_ID } = await import(rootPath)
      const { emptyGraph } = await import(dataPath)
      const x = await layoutGraph(emptyGraph())
      return x.id === ROOT_ID ? x.id : ""
    })

    expect(id).toEqual("nRoot")
  })
})
