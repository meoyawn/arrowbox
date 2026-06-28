import { Show, type Component } from "solid-js"
import type { Rect } from "../../../lib/geometry.ts"
import { type EdgeID } from "../data/data.ts"
import { createAnchors } from "../data/edge-anchor.ts"
import { store } from "../data/state.ts"
import { dragIDs } from "../drag.ts"
import { ForeignText } from "./ForeignText.tsx"

const edgeHitArea = 16

export const OneEdge: Component<{ id: EdgeID }> = props => {
  const e = () => store.tree.data.edges[props.id]

  const from = () => e().from
  const to = () => e().to
  const { fromX, fromY, toX, toY } = createAnchors(store, from, to)

  const textRect = (): Rect => ({
    x: Math.min(fromX(), toX()),
    y: Math.min(fromY(), toY()),
    width: Math.max(1, Math.abs(fromX() - toX())),
    height: Math.max(1, Math.abs(fromY() - toY())),
  })

  const isSelected = () => props.id in store.selected

  return (
    <g data-edgeID={props.id} class="group cursor-pointer">
      <line
        x1={fromX()}
        y1={fromY()}
        x2={toX()}
        y2={toY()}
        stroke="transparent"
        stroke-width={edgeHitArea}
        pointer-events="stroke"
      />

      <Show when={isSelected()}>
        <line
          class="stroke-blue-600 stroke-2"
          x1={fromX()}
          y1={fromY()}
          x2={toX()}
          y2={toY()}
          marker-end="url(#triangle)"
        />
      </Show>

      <line
        classList={{
          "stroke-black stroke-1": true,
          "group-hover:stroke-blue-600": !isSelected(),
        }}
        x1={fromX()}
        y1={fromY()}
        x2={toX()}
        y2={toY()}
        marker-end="url(#triangle)"
      />

      <circle
        data-dragID={dragIDs.edgeFrom}
        classList={{
          "cursor-grab": true,
          "invisible group-hover:visible": !isSelected(),
        }}
        fill="white"
        stroke="black"
        stroke-width={2}
        cx={fromX()}
        cy={fromY()}
        r={5}
      />

      <circle
        data-dragID={dragIDs.edgeTo}
        classList={{
          "cursor-grab": true,
          "invisible group-hover:visible": !isSelected(),
        }}
        fill="white"
        stroke="black"
        stroke-width={2}
        cx={toX()}
        cy={toY()}
        r={5}
      />

      <ForeignText
        id={props.id}
        text={e().text}
        isCenter={true}
        rect={textRect()}
      />
    </g>
  )
}
