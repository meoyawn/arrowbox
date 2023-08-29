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
