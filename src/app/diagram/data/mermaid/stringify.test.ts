import { describe, expect, mock, test } from "bun:test"
import { ROOT_ID } from "../ROOT_ID.ts"
import type { Graph } from "../data.ts"

mock.module("../../../markdown.ts", () => ({
  md2html: (markdown: string): string => markdown,
}))

describe.concurrent("toMermaid", () => {
  test("escapes double quotes in labels", async () => {
    const { toMermaid } = await import("./stringify.ts")
    const graph = {
      nodes: {
        [ROOT_ID]: {
          id: ROOT_ID,
          text: { html: "", markdown: "" },
          rect: { x: 0, y: 0, width: 0, height: 0 },
          children: ["nsource", "ntarget"],
          shape: "rect",
        },
        nsource: {
          id: "nsource",
          text: {
            html: "",
            markdown: 'GET "/encode/:photo_key": `photo_key` -> `[80]f32`',
          },
          rect: { x: 0, y: 0, width: 0, height: 0 },
          children: [],
          shape: "rect",
        },
        ntarget: {
          id: "ntarget",
          text: { html: "", markdown: "Elastic" },
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
          text: { html: "", markdown: 'query "vec"' },
        },
      },
    } satisfies Graph

    expect(toMermaid(graph, "Untitled")).toEqual(`
flowchart
source("\`GET #quot;/encode/:photo_key#quot;: &#96;photo_key&#96; -> &#96;[80]f32&#96;\`")
target("\`Elastic\`")
source -- "\`query #quot;vec#quot;\`" --> target
`)
  })
})
