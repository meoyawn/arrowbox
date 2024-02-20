import { describe, expect, test } from "vitest"
import { md2html } from "./markdown.ts"

/** @vitest-environment happy-dom */
describe.concurrent("markdown", () => {
  test("external", () => {
    expect(md2html(`[example](https://example.com)`)).toEqual(
      `<p><a href="https://example.com" rel="nofollow" target="_blank">example</a></p>\n`,
    )
  })
})
