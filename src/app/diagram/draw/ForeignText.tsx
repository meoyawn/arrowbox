import { destructure } from "@solid-primitives/destructure"
import { Show, createEffect, type Component } from "solid-js"
import { type Rect } from "../../../lib/geometry.ts"
import {
  isEdgeID,
  type EdgeID,
  type GraphText,
  type NodeID,
} from "../data/data.ts"
import { patching } from "../data/history.ts"
import { setStore, store } from "../data/state.ts"
import { setMD } from "../data/transactions.ts"

const setStoreMD = (id: NodeID | EdgeID, markdown: string): void => {
  setStore(({ tree }) => ({
    tree: patching(tree, g => setMD(g, id, markdown)),
    editing: undefined,
  }))
}

export const ForeignText: Component<{
  id: NodeID | EdgeID
  text: GraphText
  rect: Rect
  isCenter: boolean
}> = props => {
  const isEditing = () => props.id === store.editing

  const isDraggingMe = () => store.dragging && props.id in store.dragging

  const rect = () => props.rect
  const { x, y, width, height } = destructure(rect, { memo: true })

  let editor: HTMLTextAreaElement | undefined
  createEffect(() => {
    if (isEditing()) {
      editor?.focus()
    }
  })

  return (
    <foreignObject
      x={x()}
      y={y()}
      class="pointer-events-none overflow-visible"
      width={width()}
      height={height()}
    >
      <div
        classList={{
          "prose fixed inset-0 flex max-w-none justify-center": true,
          "items-center": props.isCenter,
        }}
      >
        <div
          classList={{
            "max-h-none max-w-none": true,
            "pointer-events-auto": !isDraggingMe(),
            "bg-white": isEdgeID(props.id),
          }}
          // eslint-disable-next-line solid/no-innerhtml
          innerHTML={props.text.html}
        />
      </div>

      <Show when={isEditing()}>
        <textarea
          ref={editor}
          class="pointer-events-auto fixed inset-0 resize bg-white p-2 ring-1 ring-black"
          value={props.text.markdown}
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
  )
}
