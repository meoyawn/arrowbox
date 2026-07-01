import type { Page } from "@playwright/test"
import type { Graph } from "./data/data.ts"
import {
  decodeGraphURLFragment,
  encodeGraphURLFragment,
} from "./data/url/codec.ts"

export async function gotoGraphURLFragment(
  page: Page,
  graph: Graph,
): Promise<void> {
  const fragment = await encodeGraphURLFragment(graph)
  await page.goto(`/${fragment}`)
}

export async function graphFromURLFragment(page: Page): Promise<Graph> {
  return decodeGraphURLFragment(new URL(page.url()).hash)
}
