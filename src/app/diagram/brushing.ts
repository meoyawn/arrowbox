import type RBush from "rbush"
import type { BBox } from "rbush"
import type { Rect } from "../../lib/geometry.ts"
import type { KeySet } from "../../lib/ts.ts"
import type { IdRect, Node, NodeID } from "./data/data.ts"
import { ROOT_ID } from "./data/ROOT_ID.ts"

export type NestPath = ReadonlyArray<number>

/** O(log(N)) QUICK MATHS */
export const absRect = (
  nodes: Record<NodeID, Node>,
  path: NestPath,
  offset = 0,
): IdRect => {
  if (offset > path.length) {
    throw new Error(JSON.stringify({ path, offset }))
  }

  let node = nodes[ROOT_ID]
  let x = 0
  let y = 0

  for (const pathI of path) {
    const child = node.children[pathI]
    if (!child) {
      throw new Error(JSON.stringify({ pathI, length: node.children?.length }))
    }

    node = nodes[child]
    x += node.rect.x
    y += node.rect.y
  }

  return { ...node.rect, x, y, id: node.id }
}

const rectExceedsBBox = (r: Rect, b: BBox): boolean =>
  r.x < b.minX &&
  r.y < b.minY &&
  r.x + r.width > b.maxX &&
  r.y + r.height > b.maxY

export const brushSelect = (
  rBush: RBush<IdRect>,
  bbox: BBox,
): KeySet<NodeID> => {
  const reslt = rBush.search(bbox)
  if (!reslt.length) return {}

  return Object.fromEntries(
    reslt
      .filter(r => r.id !== ROOT_ID && !rectExceedsBBox(r, bbox))
      .map(({ id }) => [id, 1]),
  )
}
