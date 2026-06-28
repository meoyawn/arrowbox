import { describe, expect, test } from "bun:test"
import { extendToFit } from "./geometry.ts"

describe.concurrent("extendToFit", () => {
  test("should extend parent rect to include child rect with padding", () => {
    const parent = { x: 0, y: 0, width: 100, height: 100 }
    const child = { x: 50, y: 50, width: 100, height: 100 }
    const padding = 10
    const result = extendToFit(parent, child, padding)
    expect(result).toEqual({ x: 0, y: 0, width: 160, height: 160 })
  })

  test("should not change parent rect if child is inside and padding is zero", () => {
    const parent = { x: 0, y: 0, width: 100, height: 100 }
    const child = { x: 25, y: 25, width: 50, height: 50 }
    const padding = 0
    const result = extendToFit(parent, child, padding)
    expect(result).toEqual(parent)
  })

  test("should handle child rect completely outside parent rect", () => {
    const parent = { x: 0, y: 0, width: 50, height: 50 }
    const child = { x: 100, y: 100, width: 50, height: 50 }
    const padding = 10
    const result = extendToFit(parent, child, padding)
    expect(result).toEqual({ x: 0, y: 0, width: 160, height: 160 })
  })

  test("should handle child rect partially outside parent rect", () => {
    const parent = { x: 0, y: 0, width: 100, height: 100 }
    const child = { x: 90, y: 90, width: 30, height: 30 }
    const padding = 5
    const result = extendToFit(parent, child, padding)
    expect(result).toEqual({ x: 0, y: 0, width: 125, height: 125 })
  })

  test("should handle zero size parent rect", () => {
    const parent = { x: 10, y: 10, width: 0, height: 0 }
    const child = { x: 20, y: 20, width: 30, height: 30 }
    const padding = 5
    const result = extendToFit(parent, child, padding)
    expect(result).toEqual({ x: 10, y: 10, width: 45, height: 45 })
  })

  test("should handle zero size child rect", () => {
    const parent = { x: 0, y: 0, width: 100, height: 100 }
    const child = { x: 50, y: 50, width: 0, height: 0 }
    const padding = 10
    const result = extendToFit(parent, child, padding)
    expect(result).toEqual({ x: 0, y: 0, width: 100, height: 100 })
  })
})
