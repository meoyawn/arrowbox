import {
  rootID,
  type Edge,
  type EdgeID,
  type Node,
  type NodeID,
  type TheDiagram,
} from "./data"

export type ParentIndex = Record<NodeID | EdgeID, NodeID>
export type DeepChildrenIndex = Record<NodeID, Record<NodeID, true>>
type FirstEdges = Record<NodeID, Edge[]>

interface EdgeIndex {
  inEdges: FirstEdges
  outEdges: FirstEdges
}

export interface GraphIndex {
  parents: ParentIndex
  deepChildren: DeepChildrenIndex
  edges: EdgeIndex
}

/** O(nodes) */
function deriveParents({ nodes }: TheDiagram): ParentIndex {
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
function deriveEdges({ edges }: TheDiagram): EdgeIndex {
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
): Record<NodeID, true> {
  const localOut: Record<NodeID, true> = {}

  for (const childID of nodes[id].children) {
    localOut[childID] = true
    Object.assign(localOut, dfsChildren(nodes, globalOut, childID))
  }

  globalOut[id] = localOut

  return localOut
}

function deriveRootChildren(
  nodes: Record<NodeID, Node>,
  rootID: NodeID,
): DeepChildrenIndex {
  const ret: DeepChildrenIndex = {}
  dfsChildren(nodes, ret, rootID)
  return ret
}

export const buildIndex = (d: TheDiagram): GraphIndex => ({
  parents: deriveParents(d),
  deepChildren: deriveRootChildren(d.nodes, rootID),
  edges: deriveEdges(d),
})
