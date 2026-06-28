import type { Rect } from "../../../lib/geometry.ts"
import { type KeySet, toKeySet } from "../../../lib/ts.ts"
import { absRect } from "../brushing.ts"
import { ROOT_ID } from "../data/ROOT_ID.ts"
import {
  isNodeID,
  type DataState,
  type EdgeID,
  type Graph,
  type NodeID,
} from "../data/data.ts"
import { nonPatching, patching } from "../data/history.ts"
import type { State } from "../data/state.ts"
import type { DragBehavior2 } from "../drag.ts"

function isDraggedNode(
  tree: DataState,
  dragging: KeySet<NodeID>,
  id: NodeID,
): boolean {
  if (id in dragging) return true

  for (const draggingID in dragging) {
    if (id in tree.index.deepChildren[draggingID as NodeID]) return true
  }

  return false
}

function isPaintedAfter(
  oldPath: ReadonlyArray<number>,
  newPath: ReadonlyArray<number>,
): boolean {
  const length = Math.min(oldPath.length, newPath.length)

  for (let i = 0; i < length; i++) {
    if (oldPath[i] !== newPath[i]) return newPath[i] > oldPath[i]
  }

  return newPath.length > oldPath.length
}

function hoverTarget(
  tree: DataState,
  dragging: KeySet<NodeID>,
  x: number,
  y: number,
): NodeID | null {
  let target: NodeID | null = null
  let targetPath: ReadonlyArray<number> | null = null

  for (const hit of tree.index.bush.search({
    maxX: x,
    maxY: y,
    minX: x,
    minY: y,
  })) {
    if (hit.id === ROOT_ID || isDraggedNode(tree, dragging, hit.id)) continue

    const path = tree.index.paths[hit.id]
    if (!targetPath || isPaintedAfter(targetPath, path)) {
      target = hit.id
      targetPath = path
    }
  }

  return target
}

/** world coordinates */
export const dragNode = (
  sx: number,
  sy: number,
  beforeDrag: Readonly<Graph>,
  selArr: ReadonlyArray<NodeID | EdgeID>,
): DragBehavior2 => {
  const dragging = toKeySet(selArr.filter(isNodeID))

  return {
    x: sx,
    y: sy,

    onDrag: (
      { tree, selected }: State,
      x: number,
      y: number,
    ): Partial<State> => {
      const dx = x - sx
      const dy = y - sy

      return {
        tree: nonPatching(tree, ({ nodes }) => {
          for (const id of selArr) {
            if (!isNodeID(id)) continue

            const oldParentID = tree.index.parents[id]
            if (oldParentID in selected) continue

            const oldR: Readonly<Rect> = beforeDrag.nodes[id].rect
            const newR: Rect = nodes[id].rect
            newR.x = oldR.x + dx
            newR.y = oldR.y + dy
          }
        }),
        hovering: hoverTarget(tree, dragging, x, y),
        dragging,
      }
    },

    onEnd(
      { hovering, tree, selected }: State,
      x: number,
      y: number,
    ): Partial<State> {
      const dx = x - sx
      const dy = y - sy

      const hoveringTarget = hoverTarget(tree, dragging, x, y) ?? hovering
      const newParentID = isNodeID(hoveringTarget) ? hoveringTarget : ROOT_ID

      return {
        tree: patching({ ...tree, data: beforeDrag }, ({ nodes }) => {
          const newParentsAbs = absRect(
            beforeDrag.nodes,
            tree.index.paths[newParentID],
          )

          for (const id of selArr) {
            if (newParentID === id || !isNodeID(id)) continue
            const oldParentID = tree.index.parents[id]
            if (oldParentID in selected) continue

            if (oldParentID !== newParentID) {
              const oldParent = nodes[oldParentID]
              oldParent.children = oldParent.children.filter(x => x !== id)
              nodes[newParentID].children.push(id)

              // TODO extend new parent
              // p.rect = extendToFit(p.rect, childR)
            }

            const oldAbs = absRect(beforeDrag.nodes, tree.index.paths[id])
            const newR = nodes[id].rect
            newR.x = oldAbs.x + dx - newParentsAbs.x
            newR.y = oldAbs.y + dy - newParentsAbs.y
          }
        }),
        hovering: hoveringTarget,
        dragging: undefined,
      }
    },
  }
}
