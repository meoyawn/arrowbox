import { Editor, Extension, type JSONContent } from "@tiptap/core"
import { Plugin } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import StarterKit from "@tiptap/starter-kit"
import Prism from "prismjs"
import "prismjs/components/prism-markup"
import "prismjs/components/prism-markdown"
import {
  createEffect,
  createSignal,
  onCleanup,
  Show,
  untrack,
  type Component,
} from "solid-js"
import { CloseIcon, SaveIcon } from "../../components.tsx"

export interface MarkdownEditorBox {
  height: number
  left: number
  top: number
  width: number
}

export type MarkdownEditorGestureEvent = TouchEvent | WheelEvent

interface ForwardedEditorGestureEvent extends Event {
  arrowboxForwardedEditorGesture?: true
}

type PrismToken = InstanceType<typeof Prism.Token>
type PrismTokenContent = string | PrismToken | PrismTokenContent[]

const isForwardedEditorGesture = (event: Event): boolean =>
  Boolean((event as ForwardedEditorGestureEvent).arrowboxForwardedEditorGesture)

const prismTokenLength = (content: PrismTokenContent): number => {
  if (typeof content === "string") return content.length

  if (Array.isArray(content)) {
    return content.reduce((sum, token) => sum + prismTokenLength(token), 0)
  }

  return prismTokenLength(content.content)
}

const prismTokenClass = (token: PrismToken): string => {
  const alias = token.alias
  const aliases = Array.isArray(alias) ? alias : alias ? [alias] : []

  return ["token", token.type, ...aliases].join(" ")
}

const addPrismDecorations = (
  tokens: PrismTokenContent[],
  from: number,
  decorations: Decoration[],
): number => {
  let offset = from

  for (const token of tokens) {
    if (typeof token === "string") {
      offset += token.length
      continue
    }

    if (Array.isArray(token)) {
      offset = addPrismDecorations(token, offset, decorations)
      continue
    }

    const start = offset
    const end = start + prismTokenLength(token)

    if (start < end) {
      decorations.push(
        Decoration.inline(start, end, { class: prismTokenClass(token) }),
      )
    }

    const content = token.content as PrismTokenContent
    if (Array.isArray(content)) addPrismDecorations(content, start, decorations)
    if (content instanceof Prism.Token) {
      addPrismDecorations([content], start, decorations)
    }

    offset = end
  }

  return offset
}

const markdownHighlight = Extension.create({
  name: "markdownHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            const decorations: Decoration[] = []

            state.doc.descendants((node, pos) => {
              if (node.type.name !== "codeBlock") return true

              addPrismDecorations(
                Prism.tokenize(node.textContent, Prism.languages.markdown),
                pos + 1,
                decorations,
              )

              return false
            })

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})

const markdownDocument = (markdown: string): JSONContent => ({
  type: "doc",
  content: [
    {
      type: "codeBlock",
      attrs: { language: "markdown" },
      content: markdown ? [{ type: "text", text: markdown }] : undefined,
    },
  ],
})

const editorMarkdown = (editor: Editor): string => {
  let markdown = ""

  editor.state.doc.descendants(node => {
    if (node.type.name !== "codeBlock") return true

    markdown = node.textContent
    return false
  })

  return markdown
}

const editorClassName =
  "markdown-tiptap pointer-events-auto absolute inset-0 resize overflow-auto bg-white break-words whitespace-pre-wrap text-black outline-none"
const wrapperClassName =
  "pointer-events-auto absolute overflow-visible bg-white"
const toolbarHeight = 48

export const MarkdownEditor: Component<{
  box: MarkdownEditorBox
  cameraScale: number
  onForwardGesture: (event: MarkdownEditorGestureEvent) => void
  onCancel: () => void
  onCommit: (markdown: string) => void
  placeholder: string
  value: string
}> = props => {
  let editor: Editor | undefined
  let editorHost: HTMLDivElement | undefined
  let editorElement: HTMLElement | undefined
  let wrapper: HTMLDivElement | undefined
  let forwardingTouchGesture = false
  let ignoreNextBlur = false
  const [draft, setDraft] = createSignal("")
  const [isCoarsePointer, setCoarsePointer] = createSignal(false)

  const editorScale = (): number => (isCoarsePointer() ? 1 : props.cameraScale)

  const editorStyle = (): string => {
    const scale = editorScale()

    return [
      isCoarsePointer() ? `bottom: 0` : "",
      `border: ${2 * scale}px solid #18181b`,
      "box-sizing: border-box",
      "caret-color: black",
      "color: black",
      `font-size: ${16 * scale}px`,
      isCoarsePointer() ? "height: auto" : "height: 100%",
      `line-height: ${24 * scale}px`,
      `padding: ${8 * scale}px`,
      "position: absolute",
      isCoarsePointer() ? `top: ${toolbarHeight}px` : "",
      `--markdown-editor-padding: ${8 * scale}px`,
      "width: 100%",
    ]
      .filter(Boolean)
      .join(";")
  }

  const wrapperStyle = (): string =>
    isCoarsePointer()
      ? [
          "bottom: var(--arrowbox-viewport-bottom, 0px)",
          "height: auto",
          "left: 0",
          "position: fixed",
          "top: var(--arrowbox-viewport-top, 0px)",
          "width: 100%",
          "z-index: 10",
        ].join(";")
      : [
          `height: ${props.box.height}px`,
          `left: ${props.box.left}px`,
          "position: absolute",
          `top: ${props.box.top}px`,
          `width: ${props.box.width}px`,
          "z-index: 10",
        ].join(";")

  const syncEditorStaticAttributes = (): void => {
    if (!editorElement) return

    editorElement.setAttribute("aria-multiline", "true")
    editorElement.setAttribute("data-testid", "foreign-text-editor")
    editorElement.setAttribute("role", "textbox")
    editorElement.tabIndex = 0
    editorElement.className = editorClassName
  }

  const syncEditorDynamicAttributes = (
    placeholder: string,
    style: string,
  ): void => {
    if (!editorElement) return

    editorElement.setAttribute("aria-label", placeholder)
    editorElement.setAttribute("data-placeholder", placeholder)
    editorElement.setAttribute("style", style)
  }

  const syncEditorEmptyState = (markdown: string): void => {
    editorElement?.setAttribute("data-empty", markdown ? "false" : "true")
  }

  createEffect(() => {
    const value = props.value
    setDraft(value)
    syncEditorEmptyState(value)

    if (editor && editorMarkdown(editor) !== value && !editor.isFocused) {
      editor.commands.setContent(markdownDocument(value), { emitUpdate: false })
    }
  })

  createEffect(() => {
    syncEditorDynamicAttributes(props.placeholder, editorStyle())
  })

  const forwardWheelGesture = (event: WheelEvent): void => {
    if (!event.ctrlKey || isForwardedEditorGesture(event)) return

    const target = event.target
    const targetInsideEditor = Boolean(
      target instanceof Node && wrapper?.contains(target),
    )
    if (!targetInsideEditor && document.activeElement !== editorElement) return

    event.preventDefault()
    event.stopPropagation()
    props.onForwardGesture(event)
  }

  const forwardTouchGesture = (event: TouchEvent): void => {
    if (event.type === "touchstart") {
      forwardingTouchGesture = event.touches.length >= 2
    }

    if (!forwardingTouchGesture && event.touches.length < 2) return

    event.preventDefault()
    event.stopPropagation()
    props.onForwardGesture(event)

    if (
      event.type === "touchend" ||
      event.type === "touchcancel" ||
      event.touches.length < 2
    ) {
      forwardingTouchGesture = false
    }
  }

  const commit = (): void => {
    props.onCommit(editor ? editorMarkdown(editor) : draft())
  }

  const cancel = (): void => {
    editor?.commands.setContent(markdownDocument(props.value), {
      emitUpdate: false,
    })
    setDraft(props.value)
    syncEditorEmptyState(props.value)
    props.onCancel()
  }

  const markToolbarAction = (): void => {
    ignoreNextBlur = true
  }

  const insertEditorText = (text: string): void => {
    if (!editor) return

    const { state, view } = editor
    view.dispatch(state.tr.insertText(text).scrollIntoView())
    view.focus()
  }

  const deleteSelectedEditorText = (): boolean => {
    if (!editor || editor.state.selection.empty) return false

    return editor.chain().deleteSelection().focus("end").run()
  }

  createEffect(() => {
    if (!editorHost || !wrapper || editor) return

    const initialDraft = untrack(draft)
    const tiptap = new Editor({
      element: editorHost,
      extensions: [
        StarterKit.configure({
          blockquote: false,
          bold: false,
          bulletList: false,
          code: false,
          codeBlock: {
            exitOnArrowDown: false,
            HTMLAttributes: { "data-markdown-source": "true" },
          },
          dropcursor: false,
          gapcursor: false,
          hardBreak: false,
          heading: false,
          horizontalRule: false,
          italic: false,
          link: false,
          listItem: false,
          listKeymap: false,
          orderedList: false,
          paragraph: false,
          strike: false,
          trailingNode: false,
          underline: false,
        }),
        markdownHighlight,
      ],
      content: markdownDocument(initialDraft),
      editorProps: {
        attributes: {
          "aria-label": props.placeholder,
          "aria-multiline": "true",
          "data-empty": initialDraft ? "false" : "true",
          "data-placeholder": props.placeholder,
          "data-testid": "foreign-text-editor",
          role: "textbox",
          class: editorClassName,
          style: editorStyle(),
        },
      },
      onUpdate({ editor }) {
        const markdown = editorMarkdown(editor)
        setDraft(markdown)
        syncEditorEmptyState(markdown)
      },
    })

    editor = tiptap
    editorElement = tiptap.view.dom
    syncEditorStaticAttributes()
    syncEditorDynamicAttributes(props.placeholder, editorStyle())
    syncEditorEmptyState(initialDraft)

    const frame = requestAnimationFrame(() => {
      tiptap.commands.focus("end", { scrollIntoView: false })
    })

    const currentEditorElement = editorElement
    const editorWrapper = wrapper
    const handleBlur = (): void => {
      if (ignoreNextBlur) {
        requestAnimationFrame(() => {
          ignoreNextBlur = false
        })
        return
      }

      commit()
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      switch (event.key) {
        case "Escape":
          event.preventDefault()
          event.stopPropagation()
          cancel()
          break

        case "Enter":
          if (event.shiftKey) {
            event.preventDefault()
            event.stopPropagation()
            insertEditorText("\n")
          } else {
            event.preventDefault()
            event.stopPropagation()
            commit()
          }
          break

        case "Backspace":
        case "Delete":
          if (deleteSelectedEditorText()) {
            event.preventDefault()
            event.stopPropagation()
          }
          break
      }
    }

    currentEditorElement.addEventListener("blur", handleBlur)
    currentEditorElement.addEventListener("keydown", handleKeyDown, {
      capture: true,
    })
    currentEditorElement.addEventListener("touchstart", forwardTouchGesture, {
      passive: false,
    })
    currentEditorElement.addEventListener("touchmove", forwardTouchGesture, {
      passive: false,
    })
    currentEditorElement.addEventListener("touchend", forwardTouchGesture, {
      passive: false,
    })
    currentEditorElement.addEventListener("touchcancel", forwardTouchGesture, {
      passive: false,
    })
    editorWrapper.addEventListener("touchstart", forwardTouchGesture, {
      capture: true,
      passive: false,
    })
    editorWrapper.addEventListener("touchmove", forwardTouchGesture, {
      capture: true,
      passive: false,
    })
    editorWrapper.addEventListener("touchend", forwardTouchGesture, {
      capture: true,
      passive: false,
    })
    editorWrapper.addEventListener("touchcancel", forwardTouchGesture, {
      capture: true,
      passive: false,
    })
    document.addEventListener("wheel", forwardWheelGesture, {
      capture: true,
      passive: false,
    })

    onCleanup(() => {
      cancelAnimationFrame(frame)
      currentEditorElement.removeEventListener("blur", handleBlur)
      currentEditorElement.removeEventListener("keydown", handleKeyDown, true)
      currentEditorElement.removeEventListener(
        "touchstart",
        forwardTouchGesture,
      )
      currentEditorElement.removeEventListener("touchmove", forwardTouchGesture)
      currentEditorElement.removeEventListener("touchend", forwardTouchGesture)
      currentEditorElement.removeEventListener(
        "touchcancel",
        forwardTouchGesture,
      )
      editorWrapper.removeEventListener("touchstart", forwardTouchGesture, true)
      editorWrapper.removeEventListener("touchmove", forwardTouchGesture, true)
      editorWrapper.removeEventListener("touchend", forwardTouchGesture, true)
      editorWrapper.removeEventListener(
        "touchcancel",
        forwardTouchGesture,
        true,
      )
      document.removeEventListener("wheel", forwardWheelGesture, true)
      tiptap.destroy()
      if (editor === tiptap) editor = undefined
      if (editorElement === currentEditorElement) editorElement = undefined
    })
  })

  createEffect(() => {
    const view = document.defaultView
    const media = view?.matchMedia("(pointer: coarse)")
    if (!media) return

    const update = (): void => {
      setCoarsePointer(media.matches)
    }

    update()
    media.addEventListener("change", update)
    onCleanup(() => media.removeEventListener("change", update))
  })

  return (
    <div
      ref={el => {
        wrapper = el
      }}
      data-testid="markdown-editor-overlay"
      class={wrapperClassName}
      style={wrapperStyle()}
      onDblClick={event => {
        event.stopPropagation()
      }}
    >
      <Show when={isCoarsePointer()}>
        <div
          class="pointer-events-auto flex h-12 items-center justify-between border-b border-zinc-300 bg-white px-3"
          data-testid="markdown-editor-mobile-toolbar"
        >
          <button
            aria-label="Cancel"
            class="flex items-center gap-2 rounded px-3 py-2 text-zinc-800"
            data-testid="markdown-editor-cancel"
            type="button"
            onMouseDown={markToolbarAction}
            onPointerDown={markToolbarAction}
            onTouchStart={markToolbarAction}
            onClick={cancel}
          >
            <CloseIcon />
            Cancel
          </button>

          <button
            aria-label="Done"
            class="flex items-center gap-2 rounded bg-zinc-900 px-3 py-2 text-white"
            data-testid="markdown-editor-done"
            type="button"
            onMouseDown={markToolbarAction}
            onPointerDown={markToolbarAction}
            onTouchStart={markToolbarAction}
            onClick={commit}
          >
            <SaveIcon />
            Done
          </button>
        </div>
      </Show>

      <div
        ref={el => {
          editorHost = el
        }}
        onDblClick={event => {
          event.stopPropagation()
        }}
      />
    </div>
  )
}
