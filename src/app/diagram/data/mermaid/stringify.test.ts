import { describe, expect, test } from "bun:test"
import { ROOT_ID } from "../ROOT_ID.ts"
import type { Graph } from "../data.ts"
import { toMermaid } from "./stringify.ts"

describe.concurrent("toMermaid", () => {
  test("escapes double quotes in labels", () => {
    const graph = {
      id: "gMermaidStringify",
      title: "Untitled",
      nodes: {
        [ROOT_ID]: {
          id: ROOT_ID,
          markdown: "",
          rect: { x: 0, y: 0, width: 0, height: 0 },
          children: ["nsource", "ntarget"],
          shape: "rect",
        },
        nsource: {
          id: "nsource",
          markdown: 'GET "/encode/:photo_key": `photo_key` -> `[80]f32`',
          rect: { x: 0, y: 0, width: 0, height: 0 },
          children: [],
          shape: "rect",
        },
        ntarget: {
          id: "ntarget",
          markdown: "Elastic",
          rect: { x: 0, y: 0, width: 0, height: 0 },
          children: [],
          shape: "rect",
        },
      },
      edges: {
        equery: {
          id: "equery",
          from: { id: "nsource", type: "node" },
          to: { id: "ntarget", type: "node" },
          markdown: 'query "vec"',
        },
      },
    } satisfies Graph

    expect(toMermaid(graph)).toEqual(`
flowchart
source("\`GET #quot;/encode/:photo_key#quot;: &#96;photo_key&#96; -> &#96;[80]f32&#96;\`")
target("\`Elastic\`")
source -- "\`query #quot;vec#quot;\`" --> target
`)
  })
})
