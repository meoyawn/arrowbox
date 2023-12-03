import { type Rect } from "../../../../lib/geometry"

export const Sides = {
  NORTH: "n",
  SOUTH: "s",
  WEST: "w",
  EAST: "e",
  NORTHWEST: "nw",
  NORTHEAST: "ne",
  SOUTHWEST: "sw",
  SOUTHEAST: "se",
} as const

export type Side = (typeof Sides)[keyof typeof Sides]

export const onDragSide = (
  oldX: number,
  oldY: number,
  onStart: Readonly<Rect>,
  side: Side,
  x: number,
  y: number,
): Readonly<Rect> => {
  const deltaX = x - oldX
  const deltaY = y - oldY

  const ret: Rect = { ...onStart }

  switch (side) {
    case Sides.NORTH:
      ret.y += deltaY
      ret.height -= deltaY
      break

    case Sides.SOUTH:
      ret.height += deltaY
      break

    case "w":
      ret.x += deltaX
      ret.width -= deltaX
      break

    case Sides.EAST:
      ret.width += deltaX
      break

    case "nw":
      ret.x += deltaX
      ret.width -= deltaX
      ret.y += deltaY
      ret.height -= deltaY
      break

    case "ne":
      ret.width += deltaX
      ret.y += deltaY
      ret.height -= deltaY
      break

    case "sw":
      ret.x += deltaX
      ret.width -= deltaX
      ret.height += deltaY
      break

    case "se":
      ret.width += deltaX
      ret.height += deltaY
      break
  }

  return ret
}
