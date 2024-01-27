import { destructure } from "@solid-primitives/destructure"
import clsx from "clsx"
import { For, Show, createEffect, type Component } from "solid-js"
import { type Rect } from "../../../lib/geometry.ts"
import { type NodeID } from "../data/data.ts"
import { patching } from "../data/history.ts"
import { setStore, store } from "../data/store.ts"
import { setMD } from "../data/transactions.ts"
import { dragIDs } from "../drag.ts"
import { ResizeSides, type ResizeSide } from "../drag/resize.ts"

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
      stroke={props.selected ? "blue" : "transparent"}
      stroke-width={1}
      class={cls()}
      data-side={props.side}
    />
  )
}

const saveMD = (id: NodeID, tArea: HTMLTextAreaElement): void =>
  setStore(s => ({
    tree: patching(s.tree, data => {
      setMD(data, id, tArea.value)
    }),
    editing: undefined,
  }))

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
  const isSelected = () => Boolean(store.selected[props.id])
  const rect = () => node().rect
  const children = () => node().children
  const isEditing = () => props.id === store.editing

  const isDragging = () => store.dragging && props.id in store.dragging

  const { x, y, width, height } = destructure(rect)

  let editor: HTMLTextAreaElement | undefined
  createEffect(() => {
    if (isEditing()) {
      editor?.focus()
    }
  })

  return (
    <g data-nodeID={props.id} transform={`translate(${x()} ${y()})`}>
      <g
        class={clsx("group hover:cursor-grab", {
          "pointer-events-none cursor-grabbing": isDragging(),
        })}
      >
        <rect
          data-dragID={dragIDs.node}
          stroke-width={2}
          stroke="black"
          fill="transparent"
          width={width()}
          height={height()}
        />

        <Show when={isSelected()}>
          <rect
            x={-5}
            y={-5}
            width={width() + 10}
            height={height() + 10}
            fill="none"
            stroke="blue"
          />
        </Show>

        <foreignObject
          class="pointer-events-none relative overflow-visible"
          width={width()}
          height={height()}
        >
          <div
            class={clsx("prose absolute inset-0 flex justify-center", {
              "items-center": children().length === 0,
            })}
          >
            <div
              // eslint-disable-next-line solid/no-innerhtml
              innerHTML={node().text.html}
            />
          </div>

          <Show when={isEditing()}>
            <textarea
              ref={editor}
              class="pointer-events-auto absolute inset-0 bg-white ring-1 ring-black"
              value={node().text.markdown}
              onBlur={({ currentTarget }) => {
                saveMD(props.id, currentTarget)
              }}
              onKeyDown={({ currentTarget, key, shiftKey }) => {
                switch (key) {
                  case "Escape":
                    setStore({ editing: undefined })
                    break

                  case "Enter":
                    if (!shiftKey) {
                      saveMD(props.id, currentTarget)
                    }
                    break
                }
              }}
            />
          </Show>
        </foreignObject>

        <circle
          data-dragID={dragIDs.newArrow}
          class={clsx("invisible cursor-move", {
            "group-hover:visible": !store.dragging,
          })}
          stroke="black"
          fill="white"
          stroke-width={2}
          cx={width() / 2}
          cy={height() / 2}
          r={5}
        />

        <Side rect={rect()} side={ResizeSides.NORTH} />
        <Side rect={rect()} side={ResizeSides.SOUTH} />
        <Side rect={rect()} side={ResizeSides.WEST} />
        <Side rect={rect()} side={ResizeSides.EAST} />

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
      </g>

      <For each={children()}>{nid => <OneNode id={nid} />}</For>
    </g>
  )
}
