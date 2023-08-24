import { pointer } from "d3-selection"
import { ZoomTransform } from "d3-zoom"

const defaultWheelDelta = (event: WheelEvent): number =>
  -event.deltaY *
  (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002) *
  (event.ctrlKey ? 10 : 1)

function scale(
  scaleExtent: readonly [number, number],
  transform: ZoomTransform,
  k: number,
): ZoomTransform {
  k = Math.max(scaleExtent[0], Math.min(scaleExtent[1], k))
  return k === transform.k
    ? transform
    : new ZoomTransform(k, transform.x, transform.y)
}

function translate(
  transform: ZoomTransform,
  p0: [number, number],
  p1: [number, number],
): ZoomTransform {
  const x = p0[0] - p1[0] * transform.k
  const y = p0[1] - p1[1] * transform.k
  return x === transform.x && y === transform.y
    ? transform
    : new ZoomTransform(transform.k, x, y)
}

type E = readonly [readonly [number, number], readonly [number, number]]

function defaultConstrain(
  transform: ZoomTransform,
  extent: E,
  translateExtent: E,
): ZoomTransform {
  const dx0 = transform.invertX(extent[0][0]) - translateExtent[0][0],
    dx1 = transform.invertX(extent[1][0]) - translateExtent[1][0],
    dy0 = transform.invertY(extent[0][1]) - translateExtent[0][1],
    dy1 = transform.invertY(extent[1][1]) - translateExtent[1][1]
  return transform.translate(
    dx1 > dx0 ? (dx0 + dx1) / 2 : Math.min(0, dx0) || Math.max(0, dx1),
    dy1 > dy0 ? (dy0 + dy1) / 2 : Math.min(0, dy0) || Math.max(0, dy1),
  )
}

function defaultExtent(e: Element): E {
  if (e instanceof SVGElement) {
    e = e.ownerSVGElement || e
    if (e.hasAttribute("viewBox")) {
      e = e.viewBox.baseVal
      return [
        [e.x, e.y],
        [e.x + e.width, e.y + e.height],
      ]
    }
    return [
      [0, 0],
      [e.width.baseVal.value, e.height.baseVal.value],
    ]
  }
  return [
    [0, 0],
    [e.clientWidth, e.clientHeight],
  ]
}

/**
 * https://github.com/d3/d3-zoom/blob/main/src/zoom.js#L234
 */
export function wheeled(t: ZoomTransform, event: WheelEvent): ZoomTransform {
  const scaleExtent = [0, Infinity] as const
  const translateExtent = [
    [-Infinity, -Infinity],
    [Infinity, Infinity],
  ] as const

  // TODO filter

  const k = Math.max(
    scaleExtent[0],
    Math.min(scaleExtent[1], t.k * Math.pow(2, defaultWheelDelta(event))),
  )
  const p = pointer(event)

  // If this wheel event won’t trigger a transform change, ignore it.
  if (t.k === k) return t

  // Otherwise, capture the mouse point and location at the start.
  const mouse = [p, t.invert(p)]

  t = scale(scaleExtent, t, k)

  t = translate(t, mouse[0], mouse[1])

  return defaultConstrain(
    t,
    defaultExtent(event.currentTarget as unknown as Element),
    translateExtent,
  )
}
