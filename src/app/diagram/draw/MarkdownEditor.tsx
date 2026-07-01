import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  type Component,
} from "solid-js"
import { lexer as markedLexer, type Token } from "marked"
import { codeEditorTheme } from "./codeEditorTheme.ts"

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

const escapeHTML = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")

const span = (cls: string, text: string): string =>
  `<span class="${cls}">${escapeHTML(text)}</span>`

const delimited = (text: string, markerLength: number): string =>
  span(codeEditorTheme.syntax.marker, text.slice(0, markerLength)) +
  escapeHTML(text.slice(markerLength, -markerLength)) +
  span(codeEditorTheme.syntax.marker, text.slice(-markerLength))

const inlineCode = (text: string): string => {
  const match = text.match(/^(`+)([\s\S]*)(`+)$/)
  if (!match) return span(codeEditorTheme.syntax.code, text)

  return (
    span(codeEditorTheme.syntax.marker, match[1] ?? "") +
    span(codeEditorTheme.syntax.code, match[2] ?? "") +
    span(codeEditorTheme.syntax.marker, match[3] ?? "")
  )
}

const link = (text: string): string => {
  const inline = text.match(
    /^(!?\[)([^\]\n]+)(\]\()([^) \n]+(?:\s+"[^"\n]*")?)(\))$/,
  )
  if (inline) {
    return (
      span(codeEditorTheme.syntax.marker, inline[1] ?? "") +
      escapeHTML(inline[2] ?? "") +
      span(codeEditorTheme.syntax.marker, inline[3] ?? "") +
      span(codeEditorTheme.syntax.link, inline[4] ?? "") +
      span(codeEditorTheme.syntax.marker, inline[5] ?? "")
    )
  }

  const reference = text.match(/^(\[)([^\]\n]+)(\]\[)([^\]\n]+)(\])$/)
  if (reference) {
    return (
      span(codeEditorTheme.syntax.marker, reference[1] ?? "") +
      escapeHTML(reference[2] ?? "") +
      span(codeEditorTheme.syntax.marker, reference[3] ?? "") +
      span(codeEditorTheme.syntax.link, reference[4] ?? "") +
      span(codeEditorTheme.syntax.marker, reference[5] ?? "")
    )
  }

  return escapeHTML(text)
}

const highlightInlineMarkdown = (markdown: string): string => {
  const token =
    /(`+[^`\n]+`+)|(\*\*[^*\n]+?\*\*)|(__[^_\n]+?__)|(\*[^*\n]+?\*)|(_[^_\n]+?_)|(!?\[[^\]\n]+\]\([^) \n]+(?:\s+"[^"\n]*")?\))|(\[[^\]\n]+\]\[[^\]\n]+\])/g
  let html = ""
  let index = 0

  for (const match of markdown.matchAll(token)) {
    const text = match[0]
    const nextIndex = match.index ?? 0
    html += escapeHTML(markdown.slice(index, nextIndex))

    if (match[1]) html += inlineCode(text)
    else if (match[2] || match[3]) html += delimited(text, 2)
    else if (match[4] || match[5]) html += delimited(text, 1)
    else html += link(text)

    index = nextIndex + text.length
  }

  return html + escapeHTML(markdown.slice(index))
}

const highlightHeading = (markdown: string): string => {
  const heading = markdown.match(/^(\s{0,3})(#{1,6})([ \t].*?)(\n*)$/)
  if (!heading) return highlightInlineMarkdown(markdown)

  return (
    escapeHTML(heading[1] ?? "") +
    span(codeEditorTheme.syntax.marker, heading[2] ?? "") +
    highlightInlineMarkdown(heading[3] ?? "") +
    escapeHTML(heading[4] ?? "")
  )
}

const highlightBlockquote = (markdown: string): string =>
  markdown
    .split(/(\n)/)
    .map(part => {
      if (part === "\n") return part

      const blockquote = part.match(/^(\s{0,3}>+[ \t]?)(.*)$/)
      if (!blockquote) return highlightInlineMarkdown(part)

      return (
        span(codeEditorTheme.syntax.marker, blockquote[1] ?? "") +
        highlightInlineMarkdown(blockquote[2] ?? "")
      )
    })
    .join("")

const highlightList = (markdown: string): string =>
  markdown
    .split(/(\n)/)
    .map(part => {
      if (part === "\n") return part

      const list = part.match(/^(\s*)([*+-]|\d+[.)])([ \t]+)(.*)$/)
      if (list) {
        return (
          escapeHTML(list[1] ?? "") +
          span(codeEditorTheme.syntax.marker, list[2] ?? "") +
          escapeHTML(list[3] ?? "") +
          highlightInlineMarkdown(list[4] ?? "")
        )
      }

      return highlightInlineMarkdown(part)
    })
    .join("")

const highlightCodeBlock = (markdown: string): string => {
  const fence = markdown.match(
    /^(\s{0,3})(`{3,}|~{3,})([^\n]*)(\n?)([\s\S]*?)(\n?)(\s{0,3})(`{3,}|~{3,})([ \t]*\n*)$/,
  )
  if (!fence) return span(codeEditorTheme.syntax.code, markdown)

  return (
    escapeHTML(fence[1] ?? "") +
    span(codeEditorTheme.syntax.marker, fence[2] ?? "") +
    span(codeEditorTheme.syntax.link, fence[3] ?? "") +
    escapeHTML(fence[4] ?? "") +
    span(codeEditorTheme.syntax.code, fence[5] ?? "") +
    escapeHTML(fence[6] ?? "") +
    escapeHTML(fence[7] ?? "") +
    span(codeEditorTheme.syntax.marker, fence[8] ?? "") +
    escapeHTML(fence[9] ?? "")
  )
}

const highlightDefinition = (markdown: string): string => {
  const definition = markdown.match(
    /^(\s{0,3}\[)([^\]\n]+)(\]:[ \t]*)(\S+)(.*)$/,
  )
  if (!definition) return highlightInlineMarkdown(markdown)

  return (
    span(codeEditorTheme.syntax.marker, definition[1] ?? "") +
    escapeHTML(definition[2] ?? "") +
    span(codeEditorTheme.syntax.marker, definition[3] ?? "") +
    span(codeEditorTheme.syntax.link, definition[4] ?? "") +
    escapeHTML(definition[5] ?? "")
  )
}

const highlightMarkdownToken = (token: Token): string => {
  switch (token.type) {
    case "blockquote":
      return highlightBlockquote(token.raw)
    case "code":
      return highlightCodeBlock(token.raw)
    case "def":
      return highlightDefinition(token.raw)
    case "heading":
      return highlightHeading(token.raw)
    case "hr":
      return span(codeEditorTheme.syntax.marker, token.raw)
    case "list":
      return highlightList(token.raw)
    case "space":
      return escapeHTML(token.raw)
    default:
      return highlightInlineMarkdown(token.raw)
  }
}

const highlightMarkdown = (markdown: string): string =>
  markedLexer(markdown, { gfm: true }).map(highlightMarkdownToken).join("")

export const MarkdownEditor: Component<{
  box: MarkdownEditorBox
  cameraScale: number
  onForwardGesture: (event: MarkdownEditorGestureEvent) => void
  onCancel: () => void
  onCommit: (markdown: string) => void
  placeholder: string
  value: string
}> = props => {
  let editor: HTMLTextAreaElement | undefined
  let highlighter: HTMLPreElement | undefined
  let wrapper: HTMLDivElement | undefined
  let forwardingTouchGesture = false
  const [draft, setDraft] = createSignal("")

  createEffect(() => {
    setDraft(props.value)
  })

  const highlightedDraft = createMemo(() => highlightMarkdown(draft()))

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

  createEffect(() => {
    const frame = requestAnimationFrame(() => {
      editor?.focus()
    })

    onCleanup(() => {
      cancelAnimationFrame(frame)
    })
  })

  createEffect(() => {
    if (!editor || !highlighter) return

    const syncEditorSize = (): void => {
      if (!editor || !highlighter) return

      highlighter.style.height = `${editor.offsetHeight}px`
      highlighter.style.width = `${editor.offsetWidth}px`
    }

    syncEditorSize()

    const resizeObserver = new ResizeObserver(syncEditorSize)
    resizeObserver.observe(editor)

    onCleanup(() => {
      resizeObserver.disconnect()
    })
  })

  createEffect(() => {
    if (!editor || !wrapper) return

    const textarea = editor
    const editorWrapper = wrapper
    textarea.addEventListener("touchstart", forwardTouchGesture, {
      passive: false,
    })
    textarea.addEventListener("touchmove", forwardTouchGesture, {
      passive: false,
    })
    textarea.addEventListener("touchend", forwardTouchGesture, {
      passive: false,
    })
    textarea.addEventListener("touchcancel", forwardTouchGesture, {
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
      textarea.removeEventListener("touchstart", forwardTouchGesture)
      textarea.removeEventListener("touchmove", forwardTouchGesture)
      textarea.removeEventListener("touchend", forwardTouchGesture)
      textarea.removeEventListener("touchcancel", forwardTouchGesture)
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
      class={codeEditorTheme.className.wrapper}
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
      <pre
        ref={el => {
          highlighter = el
        }}
        aria-hidden="true"
        data-testid="markdown-editor-highlighter"
        class={codeEditorTheme.className.highlighter}
        style={{
          border: `${2 * props.cameraScale}px solid transparent`,
          "box-sizing": "border-box",
          "font-size": `${16 * props.cameraScale}px`,
          "font-family": "inherit",
          "line-height": `${24 * props.cameraScale}px`,
          padding: `${8 * props.cameraScale}px`,
        }}
        // eslint-disable-next-line solid/no-innerhtml
        innerHTML={highlightedDraft()}
      />
      <textarea
        ref={el => {
          editor = el
        }}
        data-testid="foreign-text-editor"
        class={codeEditorTheme.className.textarea}
        value={draft()}
        placeholder={props.placeholder}
        style={{
          "-webkit-text-fill-color": codeEditorTheme.color.transparentText,
          border: `${2 * props.cameraScale}px solid ${codeEditorTheme.color.border}`,
          "box-sizing": "border-box",
          "caret-color": codeEditorTheme.color.caret,
          color: codeEditorTheme.color.text,
          "font-size": `${16 * props.cameraScale}px`,
          height: "100%",
          "line-height": `${24 * props.cameraScale}px`,
          padding: `${8 * props.cameraScale}px`,
          position: "absolute",
          width: "100%",
        }}
        onInput={({ currentTarget }) => {
          setDraft(currentTarget.value)
        }}
        onScroll={({ currentTarget }) => {
          if (!highlighter) return

          highlighter.scrollLeft = currentTarget.scrollLeft
          highlighter.scrollTop = currentTarget.scrollTop
        }}
        onDblClick={event => {
          event.stopPropagation()
        }}
        onBlur={({ currentTarget }) => {
          props.onCommit(currentTarget.value)
        }}
        onKeyDown={event => {
          const { currentTarget, key, shiftKey } = event

          switch (key) {
            case "Escape":
              event.preventDefault()
              currentTarget.value = props.value
              setDraft(props.value)
              props.onCancel()
              break

            case "Enter":
              if (!shiftKey) {
                event.preventDefault()
                props.onCommit(currentTarget.value)
              }
              break
          }
        }}
      />
    </div>
  )
}
