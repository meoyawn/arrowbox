export type Vec2 = [x: number, y: number]

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const midPoint = ({ x, y, width, height }: Rect): Vec2 => [
  x + width / 2,
  y + height / 2,
]

export function extendToFit(
  parent: Rect,
  child: Rect,
  padding: number = 10,
): Rect {
  if (padding < 0) throw new Error("padding must be positive")

  const { x: px, y: py, width: pw, height: ph } = parent
  const { x: cx, y: cy, width: cw, height: ch } = child

  const x = Math.min(px, cx - padding)
  const y = Math.min(py, cy - padding)
  const width = Math.max(px + pw, cx + cw + padding) - x
  const height = Math.max(py + ph, cy + ch + padding) - y

  return { x, y, width, height }
}

/** https://stackoverflow.com/a/31254199/1032286 */
export function pointOnRect(
  x: number,
  y: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  validate: boolean = false,
): Vec2 {
  //assert minX <= maxX;
  //assert minY <= maxY;
  if (validate && minX < x && x < maxX && minY < y && y < maxY) {
    throw new Error(
      `Point ${String([x, y])}cannot be inside the rectangle: ${String([minX, minY])} - ${String([maxX, maxY])}.`,
    )
  }

  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2
  // if (midX - x == 0) -> m == ±Inf -> minYx/maxYx == x (because value / ±Inf = ±0)
  const m = (midY - y) / (midX - x)

  if (x <= midX) {
    // check "left" side
    const minXy = m * (minX - x) + y
    if (minY <= minXy && minXy <= maxY) return [minX, minXy]
  }

  if (x >= midX) {
    // check "right" side
    const maxXy = m * (maxX - x) + y
    if (minY <= maxXy && maxXy <= maxY) return [maxX, maxXy]
  }

  if (y <= midY) {
    // check "top" side
    const minYx = (minY - y) / m + x
    if (minX <= minYx && minYx <= maxX) return [minYx, minY]
  }

  if (y >= midY) {
    // check "bottom" side
    const maxYx = (maxY - y) / m + x
    if (minX <= maxYx && maxYx <= maxX) return [maxYx, maxY]
  }

  // edge case when finding midpoint intersection: m = 0/0 = NaN
  if (x === midX && y === midY) return [x, y]

  // Should never happen :) If it does, please tell me!
  throw new Error(
    `Cannot find intersection for ${String([x, y])} inside rectangle ${String([minX, minY])} - ${String([maxX, maxY])}.`,
  )
}
