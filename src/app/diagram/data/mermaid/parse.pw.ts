import { expect, test, type Page } from "@playwright/test"

const loadHarness = async (page: Page): Promise<void> => {
  await page.goto("/")
  await page.setContent("<main></main>")
}

test.describe("parse mermaid", () => {
  test("bullshit", async ({ page }) => {
    await loadHarness(page)

    const parsed = await page.evaluate<boolean>(async () => {
      const modulePath = "/src/app/diagram/data/mermaid/parse.ts"
      const { fromMermaid } = await import(modulePath)
      return (await fromMermaid("bullshit")) === undefined
    })

    expect(parsed).toEqual(true)
  })

  test("markdown nesting", async ({ page }) => {
    await loadHarness(page)

    const childCount = await page.evaluate<number>(async () => {
      const modulePath = "/src/app/diagram/data/mermaid/parse.ts"
      const { fromMermaid } = await import(modulePath)
      const g = await fromMermaid(`
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

    const children = await page.evaluate<string[]>(async () => {
      const modulePath = "/src/app/diagram/data/mermaid/parse.ts"
      const { fromMermaid } = await import(modulePath)
      const g = await fromMermaid(`
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
