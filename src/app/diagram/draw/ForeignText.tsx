import { Show, type Component } from "solid-js"
import { Portal } from "solid-js/web"
import type { Rect } from "../../../lib/geometry.ts"
import { isEdgeID, type EdgeID, type NodeID } from "../data/data.ts"
import { patching } from "../data/history.ts"
import { setStore, store } from "../data/state.ts"
import { setMD } from "../data/transactions.ts"
import { htmlForMarkdown, populateHtmlCache } from "./html-cache.ts"
import {
  MarkdownEditor,
  type MarkdownEditorBox,
  type MarkdownEditorGestureEvent,
} from "./MarkdownEditor.tsx"

const setStoreMD = (id: NodeID | EdgeID, markdown: string): void => {
  setStore(({ tree }) => {
    const next = patching(tree, g => setMD(g, id, markdown))
    populateHtmlCache(next.index, next.data)

    return {
      tree: next,
      editing: undefined,
    }
  })
}

/**
 * Text renders inside SVG during read mode, but editing uses an HTML portal.
 * Mobile Safari has focus/selection/keyboard quirks with editable controls
 * inside foreignObject, so the markdown editor must live outside the SVG tree.
 * That also means pinch and ctrl-wheel gestures cannot bubble naturally to
 * DiagramSVG/d3-zoom, so the editor forwards cloned gesture events to canvas.
 */
export const ForeignText: Component<{
  editorLayer: () => HTMLElement | undefined
  id: NodeID | EdgeID
  onForwardEditorGesture: (event: MarkdownEditorGestureEvent) => void
  markdown: string
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

  const html = (): string => {
    return htmlForMarkdown(store.tree.index.html, props.markdown)
  }

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
              innerHTML={html()}
            />
          </Show>
        </div>
      </foreignObject>

      <Show when={isEditing() ? props.id : undefined} keyed>
        <Portal mount={props.editorLayer()}>
          <MarkdownEditor
            box={editorBox()}
            cameraScale={store.camera.k}
            onForwardGesture={props.onForwardEditorGesture}
            value={props.markdown}
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
