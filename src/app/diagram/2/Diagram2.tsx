import { destructure } from "@solid-primitives/destructure"
import { pointer, select } from "d3-selection"
import { createEffect, For, type Component } from "solid-js"
import { edgeAnchor, patching, worldPos, type EdgeID } from "../data/data"
import { SvgDefs } from "../SvgDefs"
import { nodeIDs } from "../TheApp"
import { d3Drag } from "./drag"
import { OneNode } from "./OneNode"
import { setStore, store } from "./store"
import { addNode2 } from "./transactions"

const OneEdge: Component<{ id: EdgeID }> = props => {
  const e = () => store.tree.data.edges[props.id]
  const from = () => edgeAnchor(store.tree.data.nodes, e().from)
  const to = () => edgeAnchor(store.tree.data.nodes, e().to)

  const [fromX, fromY] = destructure(from)
  const [toX, toY] = destructure(to)

  return (
    <g data-edgeID={props.id}>
      <line
        stroke-width={2}
        stroke="black"
        x1={fromX()}
        y1={fromY()}
        x2={toX()}
        y2={toY()}
        marker-end="url(#triangle)"
      />

      <line />
    </g>
  )
}

const svgTransform2 = ({
  k,
  x,
  y,
}: {
  x: number
  y: number
  k?: number
}): string => `translate(${x} ${y})` + (k ? ` scale(${k})` : "")

export const Diagram2: Component = () => {
  let ref: SVGSVGElement

  createEffect(() => {
    select(ref).call(d3Drag)
  })

  return (
    <svg
      ref={el => (ref = el)}
      class="h-full min-h-screen w-full"
      onDblClick={e => {
        const world = worldPos(store.camera, pointer(e))
        setStore(s => ({
          tree: patching(s.tree, x => {
            addNode2(x, world)
          }),
        }))
      }}
    >
      <SvgDefs />

      <g transform={svgTransform2(store.camera)}>
        <For each={nodeIDs(store.tree.data.nodes, store.dragging)}>
          {nid => <OneNode id={nid} />}
        </For>
      </g>
    </svg>
  )
}
