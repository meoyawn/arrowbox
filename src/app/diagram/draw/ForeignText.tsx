import { Show, type Component } from "solid-js"
import { Portal } from "solid-js/web"
import type { Rect } from "../../../lib/geometry.ts"
import {
  isEdgeID,
  type EdgeID,
  type GraphText,
  type NodeID,
} from "../data/data.ts"
import { patching } from "../data/history.ts"
import { setStore, store } from "../data/state.ts"
import { setMD } from "../data/transactions.ts"
import { MarkdownEditor, type MarkdownEditorBox } from "./MarkdownEditor.tsx"

const setStoreMD = (id: NodeID | EdgeID, markdown: string): void => {
  setStore(({ tree }) => ({
    tree: patching(tree, g => setMD(g, id, markdown)),
    editing: undefined,
  }))
}

export const ForeignText: Component<{
  editorLayer: () => HTMLElement | undefined
  id: NodeID | EdgeID
  text: GraphText
  rect: Rect
  worldRect: Rect
  isCenter: boolean
}> = props => {
  const isEditing = () => props.id === store.editing

  const isDraggingMe = () => store.dragging && props.id in store.dragging

  const x = () => props.rect.x
  const y = () => props.rect.y
  const width = () => props.rect.width
  const height = () => props.rect.height

  const editorBox = (): MarkdownEditorBox => ({
    height: props.worldRect.height * store.camera.k,
    left: props.worldRect.x * store.camera.k + store.camera.x,
    top: props.worldRect.y * store.camera.k + store.camera.y,
    width: props.worldRect.width * store.camera.k,
  })

  return (
    <>
      <foreignObject
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
        <Portal mount={props.editorLayer()}>
          <MarkdownEditor
            box={editorBox()}
            cameraScale={store.camera.k}
            value={props.text.markdown}
            placeholder="Markdown"
            onCancel={() => {
              setStore({ editing: undefined })
            }}
            onCommit={markdown => {
              setStoreMD(props.id, markdown)
            }}
          />
        </Portal>
      </Show>
    </>
  )
}
