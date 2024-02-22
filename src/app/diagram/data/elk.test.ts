import { describe, expect, test } from "vitest"
import { ROOT_ID } from "./ROOT_ID.ts"
import { emptyGraph } from "./data.ts"
import { layoutGraph } from "./elk.ts"

describe.concurrent("elk", () => {
  test("dynamic import", async () => {
    const x = await layoutGraph(emptyGraph())
    expect(x.id).toEqual(ROOT_ID)
  })
})
