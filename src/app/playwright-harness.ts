/**
 * Browser-only test harness for Playwright specs that need real application
 * modules without dynamic imports inside the spec files.
 *
 * The markdown, Mermaid, and ELK code paths depend on browser behavior:
 * DOMPurify expects a browser DOM, Mermaid initializes against browser globals,
 * and ELK label sizing calls document layout APIs. Plain Bun unit tests execute
 * these modules in the test runner process, where those browser contracts do not
 * hold. Direct dynamic imports inside page.evaluate worked because Vite loaded
 * the modules in the page, but that hid dependencies behind ad hoc string paths
 * in every spec.
 *
 * This harness gives those specs one explicit, statically analyzed module entry
 * point. Playwright loads it with a module script tag, so Vite still transforms
 * normal static imports, TypeScript still sees the real module graph, and the
 * tested functions still run inside the browser context that production uses.
 * Keep this file narrow: expose only the browser-bound calls that cannot be
 * lowered to ordinary Bun tests.
 */
import { emptyGraph, type Graph } from "./diagram/data/data.ts"
import { layoutGraph } from "./diagram/data/elk.ts"
import { buildIndex } from "./diagram/data/indexing.ts"
import { fromMermaid } from "./diagram/data/mermaid/parse.ts"
import { toMermaid } from "./diagram/data/mermaid/stringify.ts"
import {
  ensureStorageMigrations,
  getLastGraph,
  getStoredGraphs,
} from "./diagram/data/persistence.ts"
import { ROOT_ID } from "./diagram/data/ROOT_ID.ts"
import { populateHtmlCache } from "./diagram/draw/html-cache.ts"
import { md2html } from "./markdown.ts"

declare global {
  interface Window {
    arrowboxPw: {
      fromMermaid(str: string): Promise<Graph | undefined>
      getLastGraph(): { graph: Graph; id: string }
      getStoredGraphs(): unknown
      ensureStorageMigrations(): void
      indexHtml(graph: Graph): Record<string, string>
      indexHtmlWithPrevious(graph: Graph, next: Graph): Record<string, string>
      layoutEmptyGraphRootID(): Promise<string>
      md2html(md: string): string
      toMermaid(graph: Graph): string
    }
  }
}

window.arrowboxPw = {
  ensureStorageMigrations,
  fromMermaid,
  getLastGraph,
  getStoredGraphs,
  indexHtml(graph: Graph): Record<string, string> {
    const index = buildIndex(graph)
    populateHtmlCache(index, graph)
    return index.html
  },
  indexHtmlWithPrevious(graph: Graph, next: Graph): Record<string, string> {
    const index = buildIndex(graph)
    populateHtmlCache(index, graph)
    const nextIndex = buildIndex(next, index)
    populateHtmlCache(nextIndex, next)
    return nextIndex.html
  },
  async layoutEmptyGraphRootID(): Promise<string> {
    const x = await layoutGraph(emptyGraph())
    return x.id === ROOT_ID ? x.id : ""
  },
  md2html,
  toMermaid,
}
