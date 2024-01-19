import { createMemo, type Component } from "solid-js"
import { absEdgeAnchor, type EdgeID } from "../data/data.ts"
import { store } from "../data/store.ts"

export const OneEdge: Component<{ id: EdgeID }> = props => {
  const e = () => store.tree.data.edges[props.id]

  const from = createMemo(() => absEdgeAnchor(store.tree, e().from))
  const to = createMemo(() => absEdgeAnchor(store.tree, e().to))

  return (
    <g data-edgeID={props.id}>
      <line
        stroke-width={2}
        stroke="black"
        x1={from()[0]}
        y1={from()[1]}
        x2={to()[0]}
        y2={to()[1]}
        marker-end="url(#triangle)"
      />

      <line />
    </g>
  )
}
