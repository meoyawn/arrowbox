import type { Edge, EdgeID, Graph, Node, NodeID, NodeShape } from "../data.ts"
import type { EdgeAnchor } from "../edge-anchor.ts"

const prefix = "ab1.g."
const binaryChunkSize = 0x8000

type PackedRect = [number, number, number, number]
type PackedAnchor = [number] | [number, number, number]
type PackedNode = [number[], PackedRect, string, string, 0 | 1]
type PackedEdge = [PackedAnchor, PackedAnchor, string, string]
type PackedGraph = {
  v: number
  ids: string[]
  es: string[]
  ns: PackedNode[]
  ed: PackedEdge[]
}

function toBase64URL(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i += binaryChunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + binaryChunkSize))
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")
}

function fromBase64URL(base64url: string): Uint8Array {
  const padded = base64url
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(base64url.length / 4) * 4, "=")
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function compressString(input: string): Promise<Uint8Array> {
  const stream = new Blob([input])
    .stream()
    .pipeThrough(new CompressionStream("gzip"))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function decompressString(input: Uint8Array): Promise<string> {
  const buffer = new ArrayBuffer(input.byteLength)
  new Uint8Array(buffer).set(input)

  const stream = new Blob([buffer])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
  return await new Response(stream).text()
}

function nodeShapeCode(shape: NodeShape): 0 | 1 {
  switch (shape) {
    case "rect":
      return 0

    case "ellipse":
      return 1
  }
}

function nodeShapeFromCode(code: 0 | 1): NodeShape {
  switch (code) {
    case 0:
      return "rect"

    case 1:
      return "ellipse"
  }
}

function packAnchor(
  nodeIndexes: Map<NodeID, number>,
  anchor: EdgeAnchor,
): PackedAnchor {
  const nodeIndex = nodeIndexes.get(anchor.id)
  if (nodeIndex === undefined) throw new Error(`Unknown node ${anchor.id}`)

  switch (anchor.type) {
    case "node":
      return [nodeIndex]

    case "relative":
      return [nodeIndex, anchor.x, anchor.y]
  }
}

function unpackAnchor(ids: NodeID[], anchor: PackedAnchor): EdgeAnchor {
  const id = ids[anchor[0]]
  if (!id) throw new Error(`Unknown node index ${anchor[0]}`)
  if (anchor.length === 1) return { type: "node", id }

  return { type: "relative", id, x: anchor[1], y: anchor[2] }
}

function packGraph({ edges, nodes }: Graph): PackedGraph {
  const ids = Object.keys(nodes) as NodeID[]
  const es = Object.keys(edges) as EdgeID[]
  const nodeIndexes = new Map(ids.map((id, index) => [id, index]))

  return {
    v: 1,
    ids,
    es,
    ns: ids.map(id => {
      const node = nodes[id]
      return [
        node.children.map(childID => {
          const childIndex = nodeIndexes.get(childID)
          if (childIndex === undefined) throw new Error(`Unknown node ${id}`)
          return childIndex
        }),
        [node.rect.x, node.rect.y, node.rect.width, node.rect.height],
        node.text.markdown,
        node.text.html,
        nodeShapeCode(node.shape),
      ]
    }),
    ed: es.map(id => {
      const edge = edges[id]
      return [
        packAnchor(nodeIndexes, edge.from),
        packAnchor(nodeIndexes, edge.to),
        edge.text.markdown,
        edge.text.html,
      ]
    }),
  }
}

function unpackGraph({ ed, es, ids, ns, v }: PackedGraph): Graph {
  if (v !== 1) throw new Error(`Unsupported graph URL version ${v}`)

  const nodeIDs = ids as NodeID[]
  const edgeIDs = es as EdgeID[]
  const nodes: Record<NodeID, Node> = {}
  const edges: Record<EdgeID, Edge> = {}

  for (const [index, id] of nodeIDs.entries()) {
    const node = ns[index]
    if (!node) throw new Error(`Missing node payload ${id}`)

    nodes[id] = {
      id,
      children: node[0].map(childIndex => {
        const childID = nodeIDs[childIndex]
        if (!childID) throw new Error(`Unknown node index ${childIndex}`)
        return childID
      }),
      rect: {
        x: node[1][0],
        y: node[1][1],
        width: node[1][2],
        height: node[1][3],
      },
      text: { markdown: node[2], html: node[3] },
      shape: nodeShapeFromCode(node[4]),
    }
  }

  for (const [index, edge] of ed.entries()) {
    const id = edgeIDs[index]
    if (!id) throw new Error(`Unknown edge index ${index}`)

    edges[id] = {
      id,
      from: unpackAnchor(nodeIDs, edge[0]),
      to: unpackAnchor(nodeIDs, edge[1]),
      text: { markdown: edge[2], html: edge[3] },
    }
  }

  return { nodes, edges }
}

export async function encodeGraphURLFragment(graph: Graph): Promise<string> {
  return `#${prefix}${toBase64URL(
    await compressString(JSON.stringify(packGraph(graph))),
  )}`
}

export async function decodeGraphURLFragment(fragment: string): Promise<Graph> {
  const body = fragment.startsWith("#") ? fragment.slice(1) : fragment
  if (!body.startsWith(prefix))
    throw new Error("Unsupported graph URL fragment")

  const packed = JSON.parse(
    await decompressString(fromBase64URL(body.slice(prefix.length))),
  ) as PackedGraph
  return unpackGraph(packed)
}
