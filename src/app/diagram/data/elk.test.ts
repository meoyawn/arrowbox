import { expect, test } from "vitest"
import { emptyGraph } from "./data.ts"
import { layoutGraph } from "./elk.ts"
import { ROOT_ID } from "./ROOT_ID.ts"

test("dynamic import", async () => {
  const x = await layoutGraph(emptyGraph())
  expect(x.id).toEqual(ROOT_ID)
})
