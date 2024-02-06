import { destructure } from "@solid-primitives/destructure"
import clsx from "clsx"
import { For, Show, createEffect, type Component } from "solid-js"
import { type Rect } from "../../../lib/geometry.ts"
import { type NodeID } from "../data/data.ts"
import { patching } from "../data/history.ts"
import { setStore, store } from "../data/state.ts"
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
      stroke={props.selected ? "dodgerblue" : "transparent"}
      stroke-width={1}
      class={cls()}
      data-side={props.side}
    />
  )
}

const setStoreMD = (id: NodeID, md: string): void =>
  setStore(({ tree }) => ({
    tree: patching(tree, data => setMD(data.nodes, id, md)),
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

  const draggingAny = () => store.dragging
  const draggingMe = () => store.dragging && props.id in store.dragging

  const { x, y, width, height } = destructure(rect, { memo: true })

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
          "pointer-events-none cursor-grabbing": draggingMe(),
        })}
      >
        <rect
          x={0}
          y={0}
          rx={3}
          ry={3}
          data-dragID={dragIDs.node}
          class={clsx("stroke-black stroke-1 group-hover:stroke-blue-600", {
            "group-hover:stroke-2": draggingAny(),
          })}
          fill="transparent"
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

        <foreignObject
          x={0}
          y={0}
          class="pointer-events-none overflow-visible"
          width={width()}
          height={height()}
        >
          <div
            class={clsx("prose fixed inset-0 flex max-w-full justify-center", {
              "items-center": !children().length,
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
              class="pointer-events-auto fixed inset-0 bg-white p-2 ring-1 ring-black"
              value={node().text.markdown}
              placeholder={"Markdown"}
              onBlur={({ currentTarget }) => {
                setStoreMD(props.id, currentTarget.value)
              }}
              onKeyDown={({ currentTarget, key, shiftKey }) => {
                switch (key) {
                  case "Escape":
                    setStore({ editing: undefined })
                    break

                  case "Enter":
                    if (!shiftKey) {
                      setStoreMD(props.id, currentTarget.value)
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
            "group-hover:visible": !store.dragging && !isEditing(),
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

      <For each={children()}>{nid => <OneNode id={nid} />}</For>
    </g>
  )
}
