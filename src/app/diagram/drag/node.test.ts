import { describe, expect, test } from "bun:test"
import { zoomIdentity } from "d3-zoom"
import type { Graph, GraphID, NodeID } from "../data/data.ts"
import { emptyHistory } from "../data/history.ts"
import { buildIndex } from "../data/indexing.ts"
import { ROOT_ID } from "../data/ROOT_ID.ts"
import type { State } from "../data/state.ts"
import { dragNode } from "./node.ts"

function testState(graph: Graph, hovering: NodeID): State {
  return {
    camera: zoomIdentity,
    hovering,
    id: "gDragNodeTest" satisfies GraphID,
    selected: {},
    title: "Drag node test",
    tree: {
      data: graph,
      history: emptyHistory(),
      index: buildIndex(graph),
    },
  }
}

describe("dragNode", () => {
  test("should expand new parent when dropped child does not fit", () => {
    const graph: Graph = {
      edges: {},
      nodes: {
        [ROOT_ID]: {
          children: ["nParent", "nDragged"],
          id: ROOT_ID,
          rect: { x: 0, y: 0, width: 0, height: 0 },
          shape: "rect",
          text: { html: "", markdown: "" },
        },
        nParent: {
          children: [],
          id: "nParent",
          rect: { x: 100, y: 100, width: 100, height: 100 },
          shape: "rect",
          text: { html: "", markdown: "" },
        },
        nDragged: {
          children: [],
          id: "nDragged",
          rect: { x: 250, y: 250, width: 80, height: 80 },
          shape: "rect",
          text: { html: "", markdown: "" },
        },
      },
    }

    const next = dragNode(0, 0, graph, ["nDragged"]).onEnd(
      testState(graph, "nParent"),
      0,
      0,
    ).tree!.data

    expect(next.nodes[ROOT_ID].children).toEqual(["nParent"])
    expect(next.nodes.nParent.children).toEqual(["nDragged"])
    expect(next.nodes.nParent.rect).toEqual({
      x: 100,
      y: 100,
      width: 240,
      height: 240,
    })
    expect(next.nodes.nDragged.rect).toEqual({
      x: 150,
      y: 150,
      width: 80,
      height: 80,
    })
  })

  test("should not expand parent when moving existing child", () => {
    const graph: Graph = {
      edges: {},
      nodes: {
        [ROOT_ID]: {
          children: ["nParent"],
          id: ROOT_ID,
          rect: { x: 0, y: 0, width: 0, height: 0 },
          shape: "rect",
          text: { html: "", markdown: "" },
        },
        nParent: {
          children: ["nDragged"],
          id: "nParent",
          rect: { x: 100, y: 100, width: 100, height: 100 },
          shape: "rect",
          text: { html: "", markdown: "" },
        },
        nDragged: {
          children: [],
          id: "nDragged",
          rect: { x: 10, y: 10, width: 80, height: 80 },
          shape: "rect",
          text: { html: "", markdown: "" },
        },
      },
    }

    const next = dragNode(0, 0, graph, ["nDragged"]).onEnd(
      testState(graph, "nParent"),
      50,
      50,
    ).tree!.data

    expect(next.nodes[ROOT_ID].children).toEqual(["nParent"])
    expect(next.nodes.nParent.children).toEqual(["nDragged"])
    expect(next.nodes.nParent.rect).toEqual({
      x: 100,
      y: 100,
      width: 100,
      height: 100,
    })
    expect(next.nodes.nDragged.rect).toEqual({
      x: 60,
      y: 60,
      width: 80,
      height: 80,
    })
  })

  test("should expand every ancestor until root and preserve world positions", () => {
    const graph: Graph = {
      edges: {},
      nodes: {
        [ROOT_ID]: {
          children: ["nGrand", "nDragged"],
          id: ROOT_ID,
          rect: { x: 0, y: 0, width: 0, height: 0 },
          shape: "rect",
          text: { html: "", markdown: "" },
        },
        nGrand: {
          children: ["nParent"],
          id: "nGrand",
          rect: { x: 100, y: 100, width: 120, height: 120 },
          shape: "rect",
          text: { html: "", markdown: "" },
        },
        nParent: {
          children: [],
          id: "nParent",
          rect: { x: 20, y: 20, width: 80, height: 80 },
          shape: "rect",
          text: { html: "", markdown: "" },
        },
        nDragged: {
          children: [],
          id: "nDragged",
          rect: { x: 90, y: 90, width: 40, height: 40 },
          shape: "rect",
          text: { html: "", markdown: "" },
        },
      },
    }

    const next = dragNode(0, 0, graph, ["nDragged"]).onEnd(
      testState(graph, "nParent"),
      0,
      0,
    ).tree!.data

    expect(next.nodes[ROOT_ID].rect).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    })
    expect(next.nodes.nGrand.rect).toEqual({
      x: 70,
      y: 70,
      width: 150,
      height: 150,
    })
    expect(next.nodes.nParent.rect).toEqual({
      x: 10,
      y: 10,
      width: 120,
      height: 120,
    })
    expect(next.nodes.nDragged.rect).toEqual({
      x: 10,
      y: 10,
      width: 40,
      height: 40,
    })
  })
})
