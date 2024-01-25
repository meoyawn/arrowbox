export type Vec2 = [x: number, y: number]
export type Point = { x: number; y: number }

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

export const midPoints = ({
  height,
  width,
}: Rect): readonly [Vec2, Vec2, Vec2, Vec2] => [
  [width / 2, 0],
  [width / 2, height],
  [0, height / 2],
  [width, height / 2],
]

export const cornerPoints = ({
  height,
  width,
}: Rect): readonly [Vec2, Vec2, Vec2, Vec2] => [
  [0, 0],
  [width, 0],
  [0, height],
  [width, height],
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

export const rectLeft = ({ x }: Rect): number => x
export const rectTop = ({ y }: Rect): number => y
export const rectRight = ({ width, x }: Rect): number => x + width
export const rectBottom = ({ height, y }: Rect): number => y + height

/**
 * Finds the intersection point between
 *     * the rectangle
 *       with parallel sides to the x and y axes
 *     * the half-line pointing towards (x,y)
 *       originating from the middle of the rectangle
 *
 * Note: the function works given min[XY] <= max[XY],
 *       even though minY may not be the "top" of the rectangle
 *       because the coordinate system is flipped.
 * Note: if the input is inside the rectangle,
 *       the line segment wouldn't have an intersection with the rectangle,
 *       but the projected half-line does.
 * Warning: passing in the middle of the rectangle will return the midpoint itself
 *          there are infinitely many half-lines projected in all directions,
 *          so let's just shortcut to midpoint (GIGO).
 *
 * @param x x coordinate of point to build the half-line from
 * @param y y coordinate of point to build the half-line from
 * @param minX the "left" side of the rectangle
 * @param minY the "top" side of the rectangle
 * @param maxX the "right" side of the rectangle
 * @param maxY the "bottom" side of the rectangle
 * @param validate (optional) whether to treat point inside the rect as error
 * @return an object with x and y members for the intersection
 * @throws if validate == true and (x,y) is inside the rectangle
 * @author TWiStErRob
 * @licence Dual CC0/WTFPL/Unlicence, whatever floats your boat
 * @see <a href="http://stackoverflow.com/a/31254199/253468">source</a>
 * @see <a href="http://stackoverflow.com/a/18292964/253468">based on</a>
 */
export function pointOnRect(
  x: number,
  y: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  validate: boolean = false,
): Point {
  //assert minX <= maxX;
  //assert minY <= maxY;
  if (validate && minX < x && x < maxX && minY < y && y < maxY) {
    throw (
      "Point " +
      String([x, y]) +
      "cannot be inside " +
      "the rectangle: " +
      String([minX, minY]) +
      " - " +
      String([maxX, maxY]) +
      "."
    )
  }

  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2
  // if (midX - x == 0) -> m == ±Inf -> minYx/maxYx == x (because value / ±Inf = ±0)
  const m = (midY - y) / (midX - x)

  if (x <= midX) {
    // check "left" side
    const minXy = m * (minX - x) + y
    if (minY <= minXy && minXy <= maxY) return { x: minX, y: minXy }
  }

  if (x >= midX) {
    // check "right" side
    const maxXy = m * (maxX - x) + y
    if (minY <= maxXy && maxXy <= maxY) return { x: maxX, y: maxXy }
  }

  if (y <= midY) {
    // check "top" side
    const minYx = (minY - y) / m + x
    if (minX <= minYx && minYx <= maxX) return { x: minYx, y: minY }
  }

  if (y >= midY) {
    // check "bottom" side
    const maxYx = (maxY - y) / m + x
    if (minX <= maxYx && maxYx <= maxX) return { x: maxYx, y: maxY }
  }

  // edge case when finding midpoint intersection: m = 0/0 = NaN
  if (x === midX && y === midY) return { x: x, y: y }

  // Should never happen :) If it does, please tell me!
  throw `Cannot find intersection for ${String([x, y])} inside rectangle ${String([minX, minY])} - ${String([maxX, maxY])}.`
}
