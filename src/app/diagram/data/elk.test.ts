import { expect, test } from "vitest"
import { emptyGraph, rootID } from "./data.ts"
import { layoutGraph } from "./elk.ts"

test("dynamic import", async () => {
  const x = await layoutGraph(emptyGraph())
  expect(x.id).toEqual(rootID)
})
