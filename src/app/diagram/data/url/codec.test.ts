import { describe, expect, test } from "bun:test"
import fc from "fast-check"
import { graphArbitrary } from "../testing/graph-arbitrary.ts"
import { decodeGraphURLFragment, encodeGraphURLFragment } from "./codec.ts"

describe.concurrent("graph URL codec", () => {
  test("round-trips generated graphs", async () => {
    await fc.assert(
      fc.asyncProperty(graphArbitrary, async graph => {
        const fragment = await encodeGraphURLFragment(graph)
        const decoded = await decodeGraphURLFragment(fragment)

        expect(decoded).toEqual(graph)
      }),
      { numRuns: 100, seed: 20260701 },
    )
  })

  test("accepts fragments with or without hash prefix", async () => {
    await fc.assert(
      fc.asyncProperty(graphArbitrary, async graph => {
        const fragment = await encodeGraphURLFragment(graph)
        const decoded = await decodeGraphURLFragment(fragment.slice(1))

        expect(decoded).toEqual(graph)
      }),
      { numRuns: 20, seed: 20260702 },
    )
  })

  test("rejects unknown fragment formats", async () => {
    await expect(decodeGraphURLFragment("#not-arrowbox")).rejects.toThrow(
      "Unsupported graph URL fragment",
    )
  })

  test("rejects old graph URL prefixes", async () => {
    await expect(decodeGraphURLFragment("#ab1.g.gibberish")).rejects.toThrow(
      "Unsupported graph URL fragment",
    )
  })

  test("uses the v2 graph URL prefix", async () => {
    await fc.assert(
      fc.asyncProperty(graphArbitrary, async graph => {
        const fragment = await encodeGraphURLFragment(graph)
        expect(fragment.startsWith("#ab2.g.")).toEqual(true)
      }),
      { numRuns: 20, seed: 20260703 },
    )
  })
})
