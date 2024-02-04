import clsx from "clsx"
import { Show, type Component } from "solid-js"
import { type EdgeID } from "../data/data.ts"
import { createAnchors } from "../data/edge-anchor.ts"
import { store } from "../data/state.ts"
import { dragIDs } from "../drag.ts"

export const OneEdge: Component<{ id: EdgeID }> = props => {
  const e = () => store.tree.data.edges[props.id]

  const from = () => e().from
  const to = () => e().to
  const { fromX, fromY, toX, toY } = createAnchors(store, from, to)

  const isSelected = () => props.id in store.selected

  return (
    <g data-edgeID={props.id} class="group cursor-pointer">
      <Show when={isSelected()}>
        <line
          class="stroke-blue-600 stroke-[5px]"
          x1={fromX()}
          y1={fromY()}
          x2={toX()}
          y2={toY()}
          marker-end="url(#triangle)"
        />
      </Show>

      <line
        class={clsx("stroke-black stroke-2", {
          "group-hover:stroke-blue-600": !isSelected(),
        })}
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

      <circle
        data-dragID={dragIDs.edgeTo}
        class="invisible cursor-grab group-hover:visible"
        fill="white"
        stroke="black"
        stroke-width={2}
        cx={toX()}
        cy={toY()}
        r={5}
      />
    </g>
  )
}
