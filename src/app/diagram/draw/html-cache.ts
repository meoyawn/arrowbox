import { md2html } from "../../markdown.ts"
import type { Graph } from "../data/data.ts"
import type { GraphIndex } from "../data/indexing.ts"

export function htmlForMarkdown(
  html: Record<string, string>,
  markdown: string,
): string {
  const cached = html[markdown]
  if (cached !== undefined) return cached

  const rendered = md2html(markdown)
  html[markdown] = rendered
  return rendered
}

export function populateHtmlCache(
  index: GraphIndex,
  { edges, nodes }: Graph,
): void {
  for (const node of Object.values(nodes))
    htmlForMarkdown(index.html, node.markdown)
  for (const edge of Object.values(edges))
    htmlForMarkdown(index.html, edge.markdown)
}
