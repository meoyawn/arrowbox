import { describe, expect, test } from "bun:test"
import { ZoomTransform } from "d3-zoom"
import { dotGridAxisDots, dotGridScreenSpacing } from "./DotGrid.tsx"

describe("DotGrid", () => {
  test("should keep existing world dots stable when screen width grows", () => {
    const camera = new ZoomTransform(1.5, -17, 11)

    const narrowDots = dotGridAxisDots(camera.x, camera.k, 1, 160)
    const wideDots = dotGridAxisDots(camera.x, camera.k, 1, 320)

    expect(wideDots.slice(0, narrowDots.length)).toEqual(narrowDots)
  })

  test("should place dots on world grid coordinates", () => {
    const camera = new ZoomTransform(2, -7, 0)

    const dots = dotGridAxisDots(camera.x, camera.k, 1, 120)

    expect(dots.map(dot => dot.worldCoordinate)).toEqual([16, 32, 48])
    expect(dots.map(dot => dot.screenCoordinate)).toEqual([25, 57, 89])
  })

  test("should scale screen spacing from world spacing", () => {
    const camera = new ZoomTransform(0.5, 0, 0)

    expect(dotGridScreenSpacing(camera, 4)).toEqual(32)
  })
})
