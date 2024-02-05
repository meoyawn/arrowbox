import { expect, test } from "vitest"
import { genID } from "./data.ts"
import { newTitle } from "./persistence.ts"

test("new title", () => {
  expect(newTitle({})).toBe("Untitled 1")

  expect(
    newTitle({ [genID("g")]: { title: "Untitled", lastModifiedMs: 1 } }),
  ).toBe("Untitled 1")

  expect(
    newTitle({
      [genID("g")]: { title: "Untitled", lastModifiedMs: 1 },
      [genID("g")]: { title: "Untitled 1", lastModifiedMs: 1 },
    }),
  ).toBe("Untitled 2")
})
