import RBush, { type BBox } from "rbush"
import { type KeySet } from "../../../lib/ts.ts"
import { absRect, type NestPath } from "../brushing.ts"
import {
  type Edge,
  type EdgeID,
  type Graph,
  type IdRect,
  type Node,
  type NodeID,
} from "./data"
import { ROOT_ID } from "./ROOT_ID.ts"

export type ParentIndex = Record<NodeID, NodeID>
export type DeepChildrenIndex = Record<NodeID, KeySet<NodeID>>
type FirstEdges = Record<NodeID, Edge[]>

interface EdgeIndex {
  inEdges: FirstEdges
  outEdges: FirstEdges
}

/** O(nodes) */
const indexParents = (nodes: Record<NodeID, Node>): ParentIndex => {
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
const deriveEdges = (edges: Record<EdgeID, Edge>): EdgeIndex => {
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

const dfsChildren = (
  nodes: Record<NodeID, Node>,
  globalOut: DeepChildrenIndex,
  id: NodeID,
): KeySet<NodeID> => {
  const localOut: KeySet<NodeID> = {}

  for (const childID of nodes[id].children) {
    localOut[childID] = true
    Object.assign(localOut, dfsChildren(nodes, globalOut, childID))
  }

  globalOut[id] = localOut

  return localOut
}

const indexChildren = (
  nodes: Record<NodeID, Node>,
  rootID: NodeID,
): DeepChildrenIndex => {
  const ret: DeepChildrenIndex = {}
  dfsChildren(nodes, ret, rootID)
  return ret
}

interface Queue<T> {
  shift(): T | undefined

  push(...items: T[]): number
}

type NodePath = readonly [id: NodeID, path: NestPath]

/** O(N) BFS */
export function traverse(nodes: Record<NodeID, Node>): ReadonlyArray<NodePath> {
  const queue: Queue<NodePath> = Array([ROOT_ID, []])
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

function getAbsRects(
  nodes: Record<NodeID, Node>,
): [Record<NodeID, NestPath>, Record<NodeID, IdRect>] {
  const rects: Record<NodeID, IdRect> = {}
  const paths: Record<NodeID, NestPath> = {}

  for (const [id, path] of traverse(nodes)) {
    paths[id] = path
    rects[id] = absRect(nodes, path)
  }

  return [paths, rects]
}

function buildBush(absRects: Record<NodeID, IdRect>): RBush<IdRect> {
  const rBush = new IdRectBush()
  rBush.load(Object.values(absRects))
  return rBush
}

export interface GraphIndex {
  parents: ParentIndex
  deepChildren: DeepChildrenIndex
  edges: EdgeIndex
  bush: RBush<IdRect>
  paths: Record<NodeID, NestPath>
}

export function buildIndex({ edges, nodes }: Graph): GraphIndex {
  const [paths, absRects] = getAbsRects(nodes)

  return {
    parents: indexParents(nodes),
    deepChildren: indexChildren(nodes, ROOT_ID),
    edges: deriveEdges(edges),
    bush: buildBush(absRects),
    paths,
  }
}
