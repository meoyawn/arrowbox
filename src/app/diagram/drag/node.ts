import { extendToFit, type Rect } from "../../../lib/geometry.ts"
import { type KeySet, toKeySet } from "../../../lib/ts.ts"
import { absRect } from "../brushing.ts"
import { ROOT_ID } from "../data/ROOT_ID.ts"
import {
  isNodeID,
  type DataState,
  type EdgeID,
  type Graph,
  type Node,
  type NodeID,
} from "../data/data.ts"
import { nonPatching, patching } from "../data/history.ts"
import type { ParentIndex } from "../data/indexing.ts"
import type { State } from "../data/state.ts"
import type { DragBehavior2 } from "../drag.ts"
import { measureHtml } from "../label.tsx"

function labelRect({ rect, text }: Node): Rect | null {
  if (!text.html.trim() && !text.markdown.trim()) return null

  const { height, width } = measureHtml(text.html)
  if (height === 0 && width === 0) return null

  return {
    height,
    width,
    x: (rect.width - width) / 2,
    y: 0,
  }
}

function absPositionByParents(
  nodes: Record<NodeID, Node>,
  parents: ParentIndex,
  id: NodeID,
): Pick<Rect, "x" | "y"> {
  let x = 0
  let y = 0
  let currentID = id

  for (;;) {
    const node = nodes[currentID]
    x += node.rect.x
    y += node.rect.y

    if (currentID === ROOT_ID) return { x, y }

    currentID = parents[currentID]
    if (!currentID) throw new Error(`Missing parent for ${id}`)
  }
}

function extendNodeToFit(
  nodes: Record<NodeID, Node>,
  id: NodeID,
  childRect: Rect,
): void {
  const node = nodes[id]
  const textRect = labelRect(node)
  let nextRect = extendToFit(
    { x: 0, y: 0, width: node.rect.width, height: node.rect.height },
    childRect,
  )

  if (textRect) {
    nextRect = extendToFit(nextRect, textRect)
    nextRect = extendToFit(nextRect, {
      ...childRect,
      height: childRect.height + textRect.height,
      y: childRect.y - textRect.height,
    })
  }

  if (
    nextRect.x === 0 &&
    nextRect.y === 0 &&
    nextRect.width === node.rect.width &&
    nextRect.height === node.rect.height
  ) {
    return
  }

  node.rect.x += nextRect.x
  node.rect.y += nextRect.y
  node.rect.width = nextRect.width
  node.rect.height = nextRect.height

  for (const childID of node.children) {
    const rect = nodes[childID].rect
    rect.x -= nextRect.x
    rect.y -= nextRect.y
  }
}

function extendAncestorsToFit(
  nodes: Record<NodeID, Node>,
  parents: ParentIndex,
  id: NodeID,
  childRect: Rect,
): void {
  let parentID = id
  let nextChildRect = childRect

  while (parentID !== ROOT_ID) {
    extendNodeToFit(nodes, parentID, nextChildRect)
    nextChildRect = nodes[parentID].rect
    parentID = parents[parentID]
    if (!parentID) throw new Error(`Missing parent for ${id}`)
  }
}

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
          for (const id of selArr) {
            if (newParentID === id || !isNodeID(id)) continue
            const oldParentID = tree.index.parents[id]
            if (oldParentID in selected) continue

            const oldAbs = absRect(beforeDrag.nodes, tree.index.paths[id])
            const newParentAbs = absPositionByParents(
              nodes,
              tree.index.parents,
              newParentID,
            )
            const newR = nodes[id].rect
            const isNewChild = oldParentID !== newParentID

            if (isNewChild) {
              const oldParent = nodes[oldParentID]
              oldParent.children = oldParent.children.filter(x => x !== id)
              nodes[newParentID].children.push(id)
            }

            newR.x = oldAbs.x + dx - newParentAbs.x
            newR.y = oldAbs.y + dy - newParentAbs.y

            if (isNewChild) {
              extendAncestorsToFit(nodes, tree.index.parents, newParentID, newR)
            }
          }
        }),
        hovering: hoveringTarget,
        dragging: undefined,
      }
    },
  }
}
