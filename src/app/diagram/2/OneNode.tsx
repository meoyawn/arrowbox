import { destructure } from "@solid-primitives/destructure"
import clsx from "clsx"
import { Show, type Component } from "solid-js"
import { isEl } from "../../../lib/dom"
import { type NodeID } from "../data/data"
import { setStore } from "../data/state"
import { dragBottom } from "./drag/bottom"
import { dragNewArrow } from "./drag/new-arrow"
import { dragNode } from "./drag/node"
import { store } from "./store"

const resizeLineStrokeWidth = 15

/**
 * (0,0) -------> X+
 *   |
 *   |
 *   |
 *   v
 *  Y+
 */
export const OneNode: Component<{ id: NodeID }> = props => {
  const node = () => store.tree.data.nodes[props.id]
  const rect = () => node().rect
  const selected = () => store.selected[props.id]

  const { x, y, width, height } = destructure(rect)

  return (
    <g
      data-nodeID={props.id}
      class={clsx("group hover:cursor-grab", {
        "pointer-events-none cursor-grabbing": store.dragging === props.id,
      })}
      transform={`translate(${x()} ${y()})`}
    >
      <rect
        data-dragID={dragNode.id}
        stroke-width={2}
        stroke="black"
        fill="transparent"
        width={width()}
        height={height()}
      />

      <Show when={selected()}>
        <rect
          x={-5}
          y={-5}
          width={width() + 10}
          height={height() + 10}
          fill="transparent"
          stroke={"blue"}
        />
      </Show>

      {/*TODO html -> md*/}
      <foreignObject
        class="prose pointer-events-none"
        width={width()}
        height={height()}
        // eslint-disable-next-line solid/no-innerhtml
        innerHTML={node().text.html}
      />

      <circle
        data-dragID={dragNewArrow.id}
        class="invisible cursor-move group-hover:visible"
        stroke="black"
        fill="transparent"
        stroke-width={2}
        cx={width() / 2}
        cy={height() / 2}
        r={5}
      />

      <line
        x1={0}
        y1={0}
        x2={width()}
        y2={0}
        stroke-width={resizeLineStrokeWidth}
        stroke="transparent"
        class="hover:cursor-ns-resize"
      />

      <line
        data-dragID={dragBottom.id}
        x1={0}
        y1={height()}
        x2={width()}
        y2={height()}
        stroke-width={resizeLineStrokeWidth}
        stroke="transparent"
        class="hover:cursor-ns-resize"
      />

      <line
        x1={0}
        y1={0}
        x2={0}
        y2={height()}
        stroke-width={resizeLineStrokeWidth}
        stroke="transparent"
        class="hover:cursor-ew-resize"
      />

      <line
        x1={width()}
        y1={0}
        x2={width()}
        y2={height()}
        stroke-width={resizeLineStrokeWidth}
        stroke="transparent"
        class="hover:cursor-ew-resize"
      />
    </g>
  )
}
