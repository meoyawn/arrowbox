import { describe, expect, test } from "vitest"
import { fromMermaid } from "./parse.ts"

/** @vitest-environment happy-dom */
describe("parse mermaid", () => {
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

  test("nesting", async () => {
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
    expect(new Set(g!.nodes["nB1"].children)).toEqual(new Set(["ni1", "nf1"]))
  })
})
