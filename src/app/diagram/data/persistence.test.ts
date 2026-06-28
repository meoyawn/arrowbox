import { describe, expect, test } from "bun:test"
import { genID } from "./data.ts"
import { newTitle } from "./persistence.ts"

describe.concurrent("newTitle", () => {
  test("creates the next untitled graph name", () => {
    expect(newTitle({})).toEqual("Untitled 1")

    expect(
      newTitle({ [genID("g")]: { title: "Untitled", lastModifiedMs: 1 } }),
    ).toEqual("Untitled 1")

    expect(
      newTitle({
        [genID("g")]: { title: "Untitled", lastModifiedMs: 1 },
        [genID("g")]: { title: "Untitled 1", lastModifiedMs: 1 },
      }),
    ).toEqual("Untitled 2")
  })
})
