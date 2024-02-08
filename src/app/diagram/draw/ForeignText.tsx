import { destructure } from "@solid-primitives/destructure"
import clsx from "clsx"
import { Show, createEffect, type Component } from "solid-js"
import { type Rect } from "../../../lib/geometry.ts"
import { type EdgeID, type GraphText, type NodeID } from "../data/data.ts"
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
  pointerEvents: boolean
}> = props => {
  const isEditing = () => props.id === store.editing

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
        class={clsx("prose fixed inset-0 flex max-w-none justify-center", {
          "items-center": props.isCenter,
        })}
      >
        <div
          class={clsx("max-h-none max-w-none bg-white", {
            "pointer-events-auto": props.pointerEvents,
          })}
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
