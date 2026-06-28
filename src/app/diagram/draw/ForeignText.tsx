import {
  Show,
  createEffect,
  createSignal,
  onCleanup,
  type Component,
} from "solid-js"
import { Portal } from "solid-js/web"
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

interface EditorBox {
  height: number
  left: number
  top: number
  width: number
}

export const ForeignText: Component<{
  id: NodeID | EdgeID
  text: GraphText
  rect: Rect
  isCenter: boolean
}> = props => {
  const isEditing = () => props.id === store.editing

  const isDraggingMe = () => store.dragging && props.id in store.dragging

  const x = () => props.rect.x
  const y = () => props.rect.y
  const width = () => props.rect.width
  const height = () => props.rect.height

  let foreignObject: SVGForeignObjectElement | undefined
  let editor: HTMLTextAreaElement | undefined

  const [editorBox, setEditorBox] = createSignal<EditorBox>({
    height: 0,
    left: 0,
    top: 0,
    width: 0,
  })

  function updateEditorBox(_trackingKey?: string): void {
    if (!foreignObject) return

    const rect = foreignObject.getBoundingClientRect()
    setEditorBox({
      height: rect.height,
      left: rect.left,
      top: rect.top,
      width: rect.width,
    })
  }

  createEffect(() => {
    if (!isEditing()) return

    const frame = requestAnimationFrame(() => {
      editor?.focus()
    })

    onCleanup(() => {
      cancelAnimationFrame(frame)
    })
  })

  createEffect(() => {
    if (!isEditing()) return

    const trackingKey = [
      store.camera.x,
      store.camera.y,
      store.camera.k,
      props.rect.x,
      props.rect.y,
      props.rect.width,
      props.rect.height,
    ].join(":")

    const frame = requestAnimationFrame(() => {
      updateEditorBox(trackingKey)
    })

    onCleanup(() => {
      cancelAnimationFrame(frame)
    })
  })

  return (
    <>
      <foreignObject
        ref={foreignObject}
        x={x()}
        y={y()}
        classList={{
          "pointer-events-none": true,
          "overflow-visible": isEdgeID(props.id),
          "overflow-hidden": !isEdgeID(props.id),
        }}
        width={width()}
        height={height()}
      >
        <div
          data-testid="foreign-text-box"
          classList={{
            "flex justify-center": true,
            "overflow-visible": isEdgeID(props.id),
            "overflow-hidden": !isEdgeID(props.id),
            "items-center": props.isCenter,
          }}
          style={{ height: `${height()}px`, width: `${width()}px` }}
        >
          <Show when={!isEditing()}>
            <div
              data-testid="foreign-text-content"
              classList={{
                "prose max-w-none": true,
                "max-h-full min-w-0 max-w-full overflow-hidden break-words":
                  !isEdgeID(props.id),
                "pointer-events-auto": !isDraggingMe(),
                // apply to children
                "[&>*]:bg-white": isEdgeID(props.id),
              }}
              // eslint-disable-next-line solid/no-innerhtml
              innerHTML={props.text.html}
            />
          </Show>
        </div>
      </foreignObject>

      <Show when={isEditing()}>
        <Portal>
          <textarea
            ref={el => {
              editor = el
            }}
            data-testid="foreign-text-editor"
            class="resize bg-white p-2 outline-none"
            value={props.text.markdown}
            placeholder={"Markdown"}
            style={{
              border: `${2 * store.camera.k}px solid #2563eb`,
              "font-size": `${16 * store.camera.k}px`,
              height: `${editorBox().height}px`,
              left: `${editorBox().left}px`,
              "line-height": `${24 * store.camera.k}px`,
              padding: `${8 * store.camera.k}px`,
              position: "fixed",
              top: `${editorBox().top}px`,
              width: `${editorBox().width}px`,
              "z-index": "10",
            }}
            onBlur={({ currentTarget }) => {
              setStoreMD(props.id, currentTarget.value)
            }}
            onKeyDown={event => {
              const { currentTarget, key, shiftKey } = event

              switch (key) {
                case "Escape":
                  event.preventDefault()
                  currentTarget.value = props.text.markdown
                  setStore({ editing: undefined })
                  break

                case "Enter":
                  if (!shiftKey) {
                    event.preventDefault()
                    setStoreMD(props.id, currentTarget.value)
                  }
                  break
              }
            }}
          />
        </Portal>
      </Show>
    </>
  )
}
