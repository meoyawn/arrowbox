import { destructure } from "@solid-primitives/destructure"
import { Show, createMemo, type Component } from "solid-js"
import { midPoint } from "../../../lib/geometry.ts"
import { absRect } from "../brushing.ts"
import { absEdgeAnchor, type EdgeID } from "../data/data.ts"
import { store } from "../data/state.ts"
import { dragIDs } from "../drag.ts"

export const OneEdge: Component<{ id: EdgeID }> = props => {
  const e = () => store.tree.data.edges[props.id]

  const midFrom = createMemo(() =>
    midPoint(
      absRect(store.tree.data.nodes, store.tree.index.paths[e().from.id]),
    ),
  )
  const midTo = createMemo(() =>
    midPoint(absRect(store.tree.data.nodes, store.tree.index.paths[e().to.id])),
  )

  const from = () => absEdgeAnchor(store.tree, e().from, midTo()[0], midTo()[1])
  const [fromX, fromY] = destructure(from)

  const to = () => absEdgeAnchor(store.tree, e().to, midFrom()[0], midFrom()[1])
  const [toX, toY] = destructure(to)

  return (
    <g data-edgeID={props.id} class="group cursor-pointer">
      <Show when={props.id in store.selected}>
        <line
          stroke-width={5}
          stroke="dodgerblue"
          x1={fromX()}
          y1={fromY()}
          x2={toX()}
          y2={toY()}
          marker-end="url(#triangle)"
        />
      </Show>

      <line
        stroke-width={2}
        stroke="black"
        x1={fromX()}
        y1={fromY()}
        x2={toX()}
        y2={toY()}
        marker-end="url(#triangle)"
      />

      <circle
        data-dragID={dragIDs.edgeFrom}
        class="invisible cursor-grab group-hover:visible"
        fill="white"
        stroke="black"
        stroke-width={2}
        cx={fromX()}
        cy={fromY()}
        r={5}
      />
    </g>
  )
}
