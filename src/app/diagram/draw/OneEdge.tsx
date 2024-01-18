import { type Component } from "solid-js"
import { edgeAnchor, type EdgeID } from "../data/data.ts"
import { store } from "../data/store.ts"

export const OneEdge: Component<{ id: EdgeID }> = props => {
  const tree = () => store.tree

  const index = () => tree().index

  const data = () => tree().data

  const e = () => data().edges[props.id]

  const from = () =>
    edgeAnchor(
      data().nodes[e().from.id].rect,
      e().from,
      index().absRects[index().parents[e().from.id]],
    )
  const to = () =>
    edgeAnchor(
      data().nodes[e().to.id].rect,
      e().to,
      index().absRects[index().parents[e().to.id]],
    )

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
