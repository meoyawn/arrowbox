import { destructure } from "@solid-primitives/destructure"
import { type Component } from "solid-js"
import { edgeAnchor, type EdgeID } from "../data/data.ts"
import { store } from "../store.ts"

export const OneEdge: Component<{ id: EdgeID }> = props => {
  const e = () => store.tree.data.edges[props.id]

  const from = () => edgeAnchor(store.tree.index.absRects, e().from)
  const to = () => edgeAnchor(store.tree.index.absRects, e().to)

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
