import { type Rect } from "../../../../lib/geometry"

export type Side = "n" | "w" | "e" | "s" | "nw" | "ne" | "sw" | "se"

export function onDragSide(
  oldX: number,
  oldY: number,
  onStart: Readonly<Rect>,
  side: Side,
  x: number,
  y: number,
): Readonly<Rect> {
  const deltaX = x - oldX
  const deltaY = y - oldY

  const ret: Rect = { ...onStart }

  switch (side) {
    case "n":
      ret.y += deltaY
      ret.height -= deltaY
      break

    case "s":
      ret.height += deltaY
      break

    case "w":
      ret.x += deltaX
      ret.width -= deltaX
      break

    case "e":
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
