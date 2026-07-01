import { describe, expect, test } from "bun:test"
import { zoomIdentity } from "d3-zoom"
import type { Graph, GraphID } from "../data/data.ts"
import { emptyHistory } from "../data/history.ts"
import { buildIndex } from "../data/indexing.ts"
import { ROOT_ID } from "../data/ROOT_ID.ts"
import type { State } from "../data/state.ts"
import { dragSide, ResizeSides } from "./resize.ts"

function testState(graph: Graph): State {
  return {
    camera: zoomIdentity,
    id: "gResizeTest" satisfies GraphID,
    selected: {},
    tree: {
      data: graph,
      history: emptyHistory(),
      index: buildIndex(graph),
    },
  }
}

function testGraph(): Graph {
  return {
    id: "gResizeTest",
    title: "Resize test",
    edges: {},
    nodes: {
      [ROOT_ID]: {
        children: ["nParent"],
        id: ROOT_ID,
        rect: { x: 0, y: 0, width: 0, height: 0 },
        shape: "rect",
        markdown: "",
      },
      nParent: {
        children: ["nChild"],
        id: "nParent",
        rect: { x: 100, y: 100, width: 100, height: 80 },
        shape: "rect",
        markdown: "",
      },
      nChild: {
        children: ["nGrandchild"],
        id: "nChild",
        rect: { x: 20, y: 10, width: 30, height: 20 },
        shape: "rect",
        markdown: "",
      },
      nGrandchild: {
        children: [],
        id: "nGrandchild",
        rect: { x: 5, y: 6, width: 7, height: 8 },
        shape: "rect",
        markdown: "",
      },
    },
  }
}

describe("dragSide", () => {
  test("should add half of east resize width as child left padding", () => {
    const graph = testGraph()

    const next = dragSide(graph, "nParent", ResizeSides.EAST, 0, 0).onEnd(
      testState(graph),
      40,
      0,
    ).tree!.data

    expect(next.nodes.nParent.rect).toEqual({
      x: 100,
      y: 100,
      width: 140,
      height: 80,
    })
    expect(next.nodes.nChild.rect).toEqual({
      x: 40,
      y: 10,
      width: 30,
      height: 20,
    })
    expect(next.nodes.nGrandchild.rect).toEqual({
      x: 5,
      y: 6,
      width: 7,
      height: 8,
    })
  })

  test("should add half of diagonal resize growth as child top-left padding", () => {
    const graph = testGraph()

    const next = dragSide(graph, "nParent", ResizeSides.NORTHWEST, 0, 0).onEnd(
      testState(graph),
      -40,
      -20,
    ).tree!.data

    expect(next.nodes.nParent.rect).toEqual({
      x: 60,
      y: 80,
      width: 140,
      height: 100,
    })
    expect(next.nodes.nChild.rect).toEqual({
      x: 40,
      y: 20,
      width: 30,
      height: 20,
    })
  })

  test("should calculate child padding from original drag state", () => {
    const graph = testGraph()
    const behavior = dragSide(graph, "nParent", ResizeSides.EAST, 0, 0)
    const firstTree = behavior.onDrag(testState(graph), 40, 0).tree!

    const next = behavior.onDrag(
      {
        ...testState(graph),
        tree: firstTree,
      },
      80,
      0,
    ).tree!.data

    expect(next.nodes.nParent.rect).toEqual({
      x: 100,
      y: 100,
      width: 180,
      height: 80,
    })
    expect(next.nodes.nChild.rect).toEqual({
      x: 60,
      y: 10,
      width: 30,
      height: 20,
    })
  })
})
