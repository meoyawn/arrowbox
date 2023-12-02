export type Vec2 = [x: number, y: number]

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const midPoint = ({ x, y, width, height }: Rect): Readonly<Vec2> => [
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
