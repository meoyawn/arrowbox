import { describe, expect, test } from "vitest"
import { fromMermaid } from "./mermaid.ts"

/** @vitest-environment happy-dom */
describe.concurrent("mermaid", () => {
  test("bullshit", async () => {
    const g = await fromMermaid("bullshit")
    expect(g).toEqual(undefined)
  })

  test("nesting", async () => {
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
    expect(g!.nodes["n**Two**"].children.length).toEqual(3)
  })
})
