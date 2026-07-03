import { describe, expect, test } from "bun:test"
import { ZoomTransform } from "d3-zoom"
import {
  dotGridAxisDots,
  dotGridScreenSpacing,
  dotGridStyle,
} from "./DotGrid.tsx"

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

  test("should emit visible CSS grid layers with matching spacing", () => {
    const camera = new ZoomTransform(1, 0, 0)

    const style = dotGridStyle(camera)

    expect(style["background-size"]).toEqual("64px 64px, 16px 16px")
    expect(style["background-position"]).toEqual("32px 32px, 8px 8px")
    expect(style["background-repeat"]).toEqual("repeat")
  })

  test("should fade CSS layers according to screen spacing visibility", () => {
    const camera = new ZoomTransform(1, 0, 0)

    const style = dotGridStyle(camera)

    expect(style["background-image"]).toContain("rgb(148 163 184 / 0.82)")
    expect(style["background-image"]).toContain(
      "rgb(148 163 184 / 0.2733333333333333)",
    )
    expect(style["background-image"]).toContain("circle at center")
  })

  test("should align CSS background positions to camera translation", () => {
    const camera = new ZoomTransform(0.5, -17, 11)

    const style = dotGridStyle(camera)

    expect(style["background-size"]).toEqual("32px 32px")
    expect(style["background-position"]).toEqual("31px 27px")
  })
})
