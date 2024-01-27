import { Show, createMemo, type Component } from "solid-js"
import { absEdgeAnchor, type EdgeID } from "../data/data.ts"
import { store } from "../data/store.ts"

export const OneEdge: Component<{ id: EdgeID }> = props => {
  const e = () => store.tree.data.edges[props.id]

  const from = createMemo(() => absEdgeAnchor(store.tree, e().from, e().to.id))
  const to = createMemo(() => absEdgeAnchor(store.tree, e().to, e().from.id))

  return (
    <g data-edgeID={props.id}>
      <Show when={props.id in store.selected}>
        <line
          stroke-width={3}
          stroke="blue"
          x1={from()[0]}
          y1={from()[1]}
          x2={to()[0]}
          y2={to()[1]}
          marker-end="url(#triangle)"
        />
      </Show>

      <line
        stroke-width={2}
        stroke="black"
        x1={from()[0]}
        y1={from()[1]}
        x2={to()[0]}
        y2={to()[1]}
        marker-end="url(#triangle)"
      />
    </g>
  )
}
