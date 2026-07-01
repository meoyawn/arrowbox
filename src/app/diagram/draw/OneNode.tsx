import { For, Show, type Component } from "solid-js"
import type { Rect } from "../../../lib/geometry.ts"
import type { NodeID } from "../data/data.ts"
import { store } from "../data/state.ts"
import { dragIDs } from "../drag.ts"
import { ResizeSides, type ResizeSide } from "../drag/resize.ts"
import { ForeignText } from "./ForeignText.tsx"
import type { MarkdownEditorGestureEvent } from "./MarkdownEditor.tsx"

const sideArea = 14

const Side: Component<{
  rect: Rect
  side: ResizeSide
}> = props => {
  const x1 = () => (props.side === ResizeSides.EAST ? props.rect.width : 0)
  const y1 = () => (props.side === ResizeSides.SOUTH ? props.rect.height : 0)
  const x2 = () => (props.side === ResizeSides.WEST ? 0 : props.rect.width)
  const y2 = () => (props.side === ResizeSides.NORTH ? 0 : props.rect.height)

  const cls = () =>
    props.side === ResizeSides.EAST || props.side === ResizeSides.WEST
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
  side: ResizeSide
  selected?: boolean
}> = props => {
  const x = () =>
    props.side === ResizeSides.NORTHEAST || props.side === ResizeSides.SOUTHEAST
      ? props.rect.width
      : 0

  const y = () =>
    props.side === ResizeSides.SOUTHWEST || props.side === ResizeSides.SOUTHEAST
      ? props.rect.height
      : 0

  const cls = () =>
    props.side === ResizeSides.NORTHEAST || props.side === ResizeSides.SOUTHWEST
      ? "hover:cursor-nesw-resize"
      : "hover:cursor-nwse-resize"

  return (
    <rect
      x={x() - sideArea / 2}
      y={y() - sideArea / 2}
      width={sideArea}
      height={sideArea}
      fill="transparent"
      stroke={props.selected ? "dodgerblue" : "transparent"}
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
export const OneNode: Component<{
  editorLayer: () => HTMLElement | undefined
  id: NodeID
  onForwardEditorGesture: (event: MarkdownEditorGestureEvent) => void
}> = props => {
  const node = () => store.tree.data.nodes[props.id]
  const isSelected = () => Boolean(store.selected[props.id])
  const rect = () => node().rect
  const children = () => node().children
  const isEditing = () => props.id === store.editing

  const draggingAny = () => Boolean(store.dragging)
  const draggingMe = () => store.dragging && props.id in store.dragging
  const hoveringDropTarget = () =>
    draggingAny() && !draggingMe() && store.hovering === props.id

  const x = () => rect().x
  const y = () => rect().y
  const width = () => rect().width
  const height = () => rect().height

  return (
    <g transform={`translate(${x()} ${y()})`}>
      <g
        data-nodeID={props.id}
        classList={{
          "group hover:cursor-grab": true,
          "pointer-events-none cursor-grabbing": draggingMe(),
        }}
      >
        <g data-dragID={dragIDs.node}>
          <rect
            x={0}
            y={0}
            rx={3}
            ry={3}
            classList={{
              "stroke-black stroke-1 group-hover:stroke-blue-600":
                !isEditing() && !hoveringDropTarget(),
              "stroke-blue-600 stroke-2": !isEditing() && hoveringDropTarget(),
              "group-hover:stroke-2": draggingAny(),
            }}
            fill="white"
            width={width()}
            height={height()}
          />

          <Show when={isSelected() && !isEditing()}>
            <rect
              x={-5}
              y={-5}
              width={width() + 10}
              height={height() + 10}
              fill="none"
              stroke="dodgerblue"
            />
          </Show>

          <ForeignText
            editorLayer={props.editorLayer}
            id={props.id}
            onForwardEditorGesture={props.onForwardEditorGesture}
            markdown={node().markdown}
            rect={{ x: 0, y: 0, width: width(), height: height() }}
            worldRect={rect()}
            isCenter={node().children.length === 0}
          />
        </g>

        <circle
          data-dragID={dragIDs.newArrow}
          classList={{
            "invisible cursor-move": true,
            "group-hover:visible": !store.dragging && !isEditing(),
          }}
          stroke="black"
          fill="white"
          stroke-width={2}
          cx={width() / 2}
          cy={height() / 2}
          r={5}
        />

        <g data-dragID={dragIDs.side}>
          <Side rect={rect()} side={ResizeSides.NORTH} />
          <Side rect={rect()} side={ResizeSides.SOUTH} />
          <Side rect={rect()} side={ResizeSides.WEST} />
          <Side rect={rect()} side={ResizeSides.EAST} />

          <Show when={!isEditing()}>
            <Corner
              rect={rect()}
              side={ResizeSides.NORTHWEST}
              selected={isSelected()}
            />
            <Corner
              rect={rect()}
              side={ResizeSides.NORTHEAST}
              selected={isSelected()}
            />
            <Corner
              rect={rect()}
              side={ResizeSides.SOUTHEAST}
              selected={isSelected()}
            />
            <Corner
              rect={rect()}
              side={ResizeSides.SOUTHWEST}
              selected={isSelected()}
            />
          </Show>
        </g>
      </g>

      <For each={children()}>
        {nid => (
          <OneNode
            editorLayer={props.editorLayer}
            id={nid}
            onForwardEditorGesture={props.onForwardEditorGesture}
          />
        )}
      </For>
    </g>
  )
}
