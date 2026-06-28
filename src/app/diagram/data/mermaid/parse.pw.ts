import { expect, test, type Page } from "@playwright/test"

async function loadHarness(page: Page): Promise<void> {
  await page.goto("/")
  await page.setContent("<main></main>")
  await page.addScriptTag({
    type: "module",
    url: "/src/app/playwright-harness.ts",
  })
}

test.describe("parse mermaid", () => {
  test("bullshit", async ({ page }) => {
    await loadHarness(page)

    const parsed = await page.evaluate(
      async () =>
        (await window.arrowboxPw.fromMermaid("bullshit")) === undefined,
    )

    expect(parsed).toEqual(true)
  })

  test("markdown nesting", async ({ page }) => {
    await loadHarness(page)

    const childCount = await page.evaluate(async () => {
      const g = await window.arrowboxPw.fromMermaid(`
flowchart LR

subgraph "One"
  a("\`The **cat**
  in the hat\`") -- "edge label" --> b{{"\`The **dog** in the hog\`"}}
end

subgraph "\`**Two**\`"
  c("\`The **cat**
  in the hat\`") -- "\`Bold **edge label**\`" --> d("The dog in the hog")

  subgraph Three
    child
  end
end
`)
      return g?.nodes["n**Two**"].children.length ?? 0
    })

    expect(childCount).toEqual(3)
  })

  test("subgraph nesting", async ({ page }) => {
    await loadHarness(page)

    const children = await page.evaluate(async () => {
      const g = await window.arrowboxPw.fromMermaid(`
    flowchart LR
  subgraph TOP
    direction TB
    subgraph B1
        direction RL
        i1 -->f1
    end
    subgraph B2
        direction BT
        i2 -->f2
    end
  end
  A --> TOP --> B
  B1 --> B2
  `)
      return g?.nodes["nB1"].children ?? []
    })

    expect(new Set(children)).toEqual(new Set(["ni1", "nf1"]))
  })
})
