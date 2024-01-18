import RBush, { type BBox } from "rbush"
import type { Rect } from "../../../lib/geometry.ts"
import type { RSet } from "../../../lib/ts.ts"
import type { NestPath } from "../brushing.ts"
import { absRect } from "../brushing.ts"
import {
  rootID,
  type Edge,
  type EdgeID,
  type IdRect,
  type Node,
  type NodeID,
  type NodesEdges,
} from "./data"

export type ParentIndex = Record<NodeID | EdgeID, NodeID>
export type DeepChildrenIndex = Record<NodeID, RSet<NodeID>>
type FirstEdges = Record<NodeID, Edge[]>

interface EdgeIndex {
  inEdges: FirstEdges
  outEdges: FirstEdges
}

/** O(nodes) */
function indexParents({ nodes }: NodesEdges): ParentIndex {
  const out: ParentIndex = {}

  for (const nodeID in nodes) {
    const parentID = nodeID as NodeID
    for (const childID of nodes[parentID].children) {
      out[childID] = parentID
    }
  }

  return out
}

/** O(edges) */
function deriveEdges({ edges }: NodesEdges): EdgeIndex {
  const outEdges: FirstEdges = {}
  const inEdges: FirstEdges = {}

  for (const eid in edges) {
    const e = edges[eid as EdgeID]
    const { from, to } = e

    if (to.type === "node") {
      const srcSet = inEdges[to.id] ?? []
      srcSet.push(e)
      inEdges[to.id] = srcSet
    }

    if (from.type === "node") {
      const tgtSet = outEdges[from.id] ?? []
      tgtSet.push(e)
      outEdges[from.id] = tgtSet
    }
  }

  return { outEdges, inEdges }
}

function dfsChildren(
  nodes: Record<NodeID, Node>,
  globalOut: DeepChildrenIndex,
  id: NodeID,
): RSet<NodeID> {
  const localOut: RSet<NodeID> = {}

  for (const childID of nodes[id].children) {
    localOut[childID] = true
    Object.assign(localOut, dfsChildren(nodes, globalOut, childID))
  }

  globalOut[id] = localOut

  return localOut
}

function indexChildren(
  nodes: Record<NodeID, Node>,
  rootID: NodeID,
): DeepChildrenIndex {
  const ret: DeepChildrenIndex = {}
  dfsChildren(nodes, ret, rootID)
  return ret
}

interface Queue<T> {
  shift(): T | undefined

  push(...items: T[]): number
}

type NodePath = readonly [id: NodeID, path: NestPath]

// O(N) BFS
const traverse = (nodes: Record<NodeID, Node>): ReadonlyArray<NodePath> => {
  const queue: Queue<NodePath> = Array([rootID, []])
  const ret: Array<NodePath> = []

  for (;;) {
    // rm first
    const item = queue.shift()
    if (!item) return ret

    ret.push(item)

    const [node, path] = item
    const { children } = nodes[node]
    if (!children) continue

    for (let i = 0; i < children.length; i++) {
      // add last
      queue.push([children[i], [...path, i]])
    }
  }
}

class IdRectBush extends RBush<IdRect> {
  toBBox = ({ height, width, x, y }: IdRect): BBox => ({
    minX: x,
    minY: y,
    maxX: x + width,
    maxY: y + height,
  })

  compareMinX = (a: IdRect, b: IdRect): number => a.x - b.x

  compareMinY = (a: IdRect, b: IdRect): number => a.y - b.y
}

const getAbsRects = (nodes: Record<NodeID, Node>): Record<NodeID, IdRect> => {
  const rects: Record<NodeID, IdRect> = {}

  for (const [id, path] of traverse(nodes)) {
    rects[id] = absRect(nodes, path)
  }

  return rects
}

const buildBush = (absRects: Record<NodeID, IdRect>): RBush<IdRect> => {
  const rBush = new IdRectBush()
  rBush.load(Object.values(absRects))
  return rBush
}

export interface GraphIndex {
  parents: ParentIndex
  deepChildren: DeepChildrenIndex
  edges: EdgeIndex
  bush: RBush<IdRect>
  absRects: Record<NodeID, Readonly<Rect>>
}

export const buildIndex = (d: NodesEdges): GraphIndex => {
  const absRects = getAbsRects(d.nodes)

  return {
    parents: indexParents(d),
    deepChildren: indexChildren(d.nodes, rootID),
    edges: deriveEdges(d),
    bush: buildBush(absRects),
    absRects,
  }
}
