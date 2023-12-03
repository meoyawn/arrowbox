import { destructure } from "@solid-primitives/destructure"
import clsx from "clsx"
import { Show, type Component } from "solid-js"
import { type Rect } from "../../../lib/geometry"
import { type NodeID } from "../data/data"
import { dragNewArrow } from "./drag/new-arrow"
import { dragNode } from "./drag/node"
import { Sides, type Side } from "./drag/resize"
import { store } from "./store"

const sideArea = 14

const Side: Component<{
  rect: Rect
  side: Side
}> = props => {
  const x1 = () => (props.side === Sides.EAST ? props.rect.width : 0)
  const y1 = () => (props.side === Sides.SOUTH ? props.rect.height : 0)
  const x2 = () => (props.side === Sides.WEST ? 0 : props.rect.width)
  const y2 = () => (props.side === Sides.NORTH ? 0 : props.rect.height)

  const cls = () =>
    props.side === Sides.EAST || props.side === Sides.WEST
      ? "hover:cursor-ew-resize"
      : "hover:cursor-ns-resize"

  return (
    <line
      x1={x1()}
      y1={y1()}
      x2={x2()}
      y2={y2()}
      stroke-width={sideArea}
      stroke="transparent"
      class={cls()}
      data-side={props.side}
    />
  )
}

const Corner: Component<{
  rect: Rect
  side: Side
  selected?: boolean
}> = props => {
  const x = () =>
    props.side === Sides.NORTHEAST || props.side === Sides.SOUTHEAST
      ? props.rect.width
      : 0

  const y = () =>
    props.side === Sides.SOUTHWEST || props.side === Sides.SOUTHEAST
      ? props.rect.height
      : 0

  const cls = () =>
    props.side === Sides.NORTHEAST || props.side === Sides.SOUTHWEST
      ? "hover:cursor-nesw-resize"
      : "hover:cursor-nwse-resize"

  return (
    <rect
      x={x() - sideArea / 2}
      y={y() - sideArea / 2}
      width={sideArea}
      height={sideArea}
      fill="transparent"
      stroke={props.selected ? "blue" : "transparent"}
      stroke-width={1}
      class={cls()}
      data-side={props.side}
    />
  )
}

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
          stroke="blue"
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

      <Side rect={rect()} side={Sides.NORTH} />
      <Side rect={rect()} side={Sides.SOUTH} />
      <Side rect={rect()} side={Sides.WEST} />
      <Side rect={rect()} side={Sides.EAST} />

      <Corner rect={rect()} side={Sides.NORTHWEST} selected={selected()} />
      <Corner rect={rect()} side={Sides.NORTHEAST} selected={selected()} />
      <Corner rect={rect()} side={Sides.SOUTHEAST} selected={selected()} />
      <Corner rect={rect()} side={Sides.SOUTHWEST} selected={selected()} />
    </g>
  )
}
