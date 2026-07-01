import { createEffect, createSignal, onCleanup, type Component } from "solid-js"
import { CodeJar } from "codejar"
import Prism from "prismjs"
import "prismjs/components/prism-markup"
import "prismjs/components/prism-markdown"

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

const isForwardedEditorGesture = (event: Event): boolean =>
  Boolean((event as ForwardedEditorGestureEvent).arrowboxForwardedEditorGesture)

const highlightMarkdown = (element: HTMLElement): void => {
  const markdown = element.textContent ?? ""
  element.innerHTML = Prism.highlight(
    markdown,
    Prism.languages.markdown,
    "markdown",
  )
}

const editorClassName =
  "markdown-codejar pointer-events-auto absolute inset-0 resize overflow-auto bg-white break-words whitespace-pre-wrap text-black outline-none"
const wrapperClassName =
  "pointer-events-auto absolute overflow-visible bg-white"

type MarkdownCodeJar = ReturnType<typeof CodeJar>
type RangedInputEvent = InputEvent & {
  getTargetRanges?: () => Array<StaticRange>
}

const moveCaretToEditorEnd = (editor: HTMLElement): void => {
  editor.focus()

  const selection = editor.ownerDocument.getSelection()
  if (!selection) return

  const walker = editor.ownerDocument.createTreeWalker(
    editor,
    NodeFilter.SHOW_TEXT,
  )
  let lastText: Text | undefined
  for (let current = walker.nextNode(); current; current = walker.nextNode()) {
    lastText = current instanceof Text ? current : lastText
  }

  const range = editor.ownerDocument.createRange()
  if (lastText) {
    range.setStart(lastText, lastText.data.length)
  } else {
    range.selectNodeContents(editor)
    range.collapse(false)
  }
  range.collapse(true)

  selection.removeAllRanges()
  selection.addRange(range)
}

const textOffset = (
  editor: HTMLElement,
  node: Node,
  offset: number,
): number => {
  const range = editor.ownerDocument.createRange()
  range.selectNodeContents(editor)
  range.setEnd(node, offset)
  const length = range.toString().length
  range.detach()
  return length
}

const previousWordStart = (text: string, offset: number): number => {
  let index = offset
  while (index > 0 && /\s/.test(text[index - 1] ?? "")) index -= 1
  while (index > 0 && !/\s/.test(text[index - 1] ?? "")) index -= 1
  return index
}

const nextWordEnd = (text: string, offset: number): number => {
  let index = offset
  while (index < text.length && /\s/.test(text[index] ?? "")) index += 1
  while (index < text.length && !/\s/.test(text[index] ?? "")) index += 1
  return index
}

export const MarkdownEditor: Component<{
  box: MarkdownEditorBox
  cameraScale: number
  onForwardGesture: (event: MarkdownEditorGestureEvent) => void
  onCancel: () => void
  onCommit: (markdown: string) => void
  placeholder: string
  value: string
}> = props => {
  let codeJar: MarkdownCodeJar | undefined
  let editor: HTMLDivElement | undefined
  let wrapper: HTMLDivElement | undefined
  let forwardingTouchGesture = false
  const [draft, setDraft] = createSignal("")

  const syncEmptyState = (markdown: string): void => {
    editor?.setAttribute("data-empty", markdown.length === 0 ? "true" : "false")
  }

  createEffect(() => {
    const value = props.value
    setDraft(value)
    syncEmptyState(value)

    if (codeJar && codeJar.toString() !== value) {
      codeJar.updateCode(value, false)
    }
  })

  const forwardWheelGesture = (event: WheelEvent): void => {
    if (!event.ctrlKey || isForwardedEditorGesture(event)) return

    const target = event.target
    const targetInsideEditor = Boolean(
      target instanceof Node && wrapper?.contains(target),
    )
    if (!targetInsideEditor && document.activeElement !== editor) return

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
    props.onCommit(codeJar?.toString() ?? draft())
  }

  const cancel = (): void => {
    codeJar?.updateCode(props.value, false)
    setDraft(props.value)
    syncEmptyState(props.value)
    props.onCancel()
  }

  const replaceCodeRange = (
    start: number,
    end: number,
    replacement: string,
  ): boolean => {
    if (!codeJar) return false

    const code = codeJar.toString()
    const safeStart = Math.max(0, Math.min(start, code.length))
    const safeEnd = Math.max(safeStart, Math.min(end, code.length))
    const next = code.slice(0, safeStart) + replacement + code.slice(safeEnd)
    const caret = safeStart + replacement.length

    codeJar.recordHistory()
    codeJar.updateCode(next)
    codeJar.restore({ start: caret, end: caret })
    codeJar.recordHistory()
    setDraft(next)
    syncEmptyState(next)
    return true
  }

  /**
   * Let `beforeinput` tell us which text-delete command the platform chose,
   * then mutate CodeJar directly. Native deletion leaves Chromium's caret at
   * the start of CodeJar's `plaintext-only` editor after one Backspace, and
   * CodeJar does not special-case Backspace itself. Target ranges would be the
   * ideal path for Alt/Option+Backspace and selection deletes, but Chromium
   * returns an empty range list here, so we fall back to CodeJar's text offsets
   * and preserve the common character/word delete commands explicitly.
   */
  const deletionRangeFromInputType = (
    inputType: string,
  ): { end: number; start: number } | undefined => {
    if (!codeJar) return undefined

    const code = codeJar.toString()
    const position = codeJar.save()
    const start = Math.min(position.start, position.end)
    const end = Math.max(position.start, position.end)
    if (start !== end) return { start, end }

    switch (inputType) {
      case "deleteContentBackward":
        return start > 0 ? { start: start - 1, end } : undefined

      case "deleteContentForward":
        return end < code.length ? { start, end: end + 1 } : undefined

      case "deleteWordBackward":
        return start > 0
          ? { start: previousWordStart(code, start), end }
          : undefined

      case "deleteWordForward":
        return end < code.length
          ? { start, end: nextWordEnd(code, end) }
          : undefined
    }
  }

  const handleBeforeInput = (event: InputEvent): void => {
    const inputEvent = event as RangedInputEvent
    if (!inputEvent.inputType.startsWith("delete")) return

    const range = inputEvent.getTargetRanges?.()[0]
    if (!editor) return

    const deletionRange = range
      ? {
          start: textOffset(editor, range.startContainer, range.startOffset),
          end: textOffset(editor, range.endContainer, range.endOffset),
        }
      : deletionRangeFromInputType(inputEvent.inputType)
    if (!deletionRange) return

    const { end, start } = deletionRange
    if (!replaceCodeRange(start, end, "")) return

    inputEvent.preventDefault()
    inputEvent.stopPropagation()
  }

  createEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (editor) moveCaretToEditorEnd(editor)
    })

    onCleanup(() => {
      cancelAnimationFrame(frame)
    })
  })

  createEffect(() => {
    if (!editor || codeJar) return

    const currentEditor = editor
    const jar = CodeJar(currentEditor, highlightMarkdown, {
      addClosing: false,
      catchTab: false,
      preserveIdent: false,
      spellcheck: true,
      tab: "  ",
    })
    codeJar = jar
    jar.updateCode(draft(), false)
    syncEmptyState(draft())
    jar.onUpdate(markdown => {
      setDraft(markdown)
      syncEmptyState(markdown)
    })

    onCleanup(() => {
      jar.destroy()
      if (codeJar === jar) codeJar = undefined
    })
  })

  createEffect(() => {
    if (!editor || !wrapper) return

    const currentEditor = editor
    const editorWrapper = wrapper
    const handleBlur = (): void => {
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
          if (!event.shiftKey) {
            event.preventDefault()
            event.stopPropagation()
            commit()
          }
          break
      }
    }

    currentEditor.addEventListener("beforeinput", handleBeforeInput)
    currentEditor.addEventListener("blur", handleBlur)
    currentEditor.addEventListener("keydown", handleKeyDown, { capture: true })
    currentEditor.addEventListener("touchstart", forwardTouchGesture, {
      passive: false,
    })
    currentEditor.addEventListener("touchmove", forwardTouchGesture, {
      passive: false,
    })
    currentEditor.addEventListener("touchend", forwardTouchGesture, {
      passive: false,
    })
    currentEditor.addEventListener("touchcancel", forwardTouchGesture, {
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
      currentEditor.removeEventListener("beforeinput", handleBeforeInput)
      currentEditor.removeEventListener("blur", handleBlur)
      currentEditor.removeEventListener("keydown", handleKeyDown, true)
      currentEditor.removeEventListener("touchstart", forwardTouchGesture)
      currentEditor.removeEventListener("touchmove", forwardTouchGesture)
      currentEditor.removeEventListener("touchend", forwardTouchGesture)
      currentEditor.removeEventListener("touchcancel", forwardTouchGesture)
      editorWrapper.removeEventListener("touchstart", forwardTouchGesture, true)
      editorWrapper.removeEventListener("touchmove", forwardTouchGesture, true)
      editorWrapper.removeEventListener("touchend", forwardTouchGesture, true)
      editorWrapper.removeEventListener(
        "touchcancel",
        forwardTouchGesture,
        true,
      )
      document.removeEventListener("wheel", forwardWheelGesture, true)
    })
  })

  return (
    <div
      ref={el => {
        wrapper = el
      }}
      class={wrapperClassName}
      style={{
        height: `${props.box.height}px`,
        left: `${props.box.left}px`,
        position: "absolute",
        top: `${props.box.top}px`,
        width: `${props.box.width}px`,
        "z-index": "10",
      }}
      onDblClick={event => {
        event.stopPropagation()
      }}
    >
      <div
        ref={el => {
          editor = el
        }}
        aria-label={props.placeholder}
        aria-multiline="true"
        data-testid="foreign-text-editor"
        data-empty={props.value.length === 0 ? "true" : "false"}
        data-placeholder={props.placeholder}
        role="textbox"
        tabIndex={0}
        class={editorClassName}
        style={{
          border: `${2 * props.cameraScale}px solid #18181b`,
          "box-sizing": "border-box",
          "caret-color": "black",
          color: "black",
          "font-size": `${16 * props.cameraScale}px`,
          height: "100%",
          "line-height": `${24 * props.cameraScale}px`,
          padding: `${8 * props.cameraScale}px`,
          position: "absolute",
          width: "100%",
        }}
        onDblClick={event => {
          event.stopPropagation()
        }}
      />
    </div>
  )
}
