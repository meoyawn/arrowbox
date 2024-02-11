import { parse } from "@mermaid-js/parser"
import { type Graph } from "./data.ts"

export function toMermaid({ nodes }: Graph, title: string): string {
  return `---
  title: ${title}
  ---
  %%{init: {"flowchart": {"htmlLabels": false}} }%%
  flowchart LR
   ${Object.values(nodes)
     .map(({ id, text }) => `${id}("${text.markdown}")`)
     .join("\n")}
  `
}

export function fromMermaid(str: string): unknown | undefined {
  console.log(str)
  try {
    return parse("info", str)
  } catch (e) {
    console.error(e)
  }
}
