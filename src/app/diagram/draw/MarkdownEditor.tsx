import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  type Component,
} from "solid-js"
import { codeEditorTheme } from "./codeEditorTheme.ts"

export interface MarkdownEditorBox {
  height: number
  left: number
  top: number
  width: number
}

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

const inlineCode = (text: string): string =>
  span(codeEditorTheme.syntax.marker, "`") +
  span(codeEditorTheme.syntax.code, text.slice(1, -1)) +
  span(codeEditorTheme.syntax.marker, "`")

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
    /(`[^`\n]+`)|(\*\*[^*\n]+?\*\*)|(__[^_\n]+?__)|(\*[^*\n]+?\*)|(_[^_\n]+?_)|(!?\[[^\]\n]+\]\([^) \n]+(?:\s+"[^"\n]*")?\))|(\[[^\]\n]+\]\[[^\]\n]+\])/g
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

const highlightMarkdown = (markdown: string): string => {
  let isFencedCode = false

  return markdown
    .split("\n")
    .map(line => {
      const fence = line.match(/^(\s{0,3})(`{3,}|~{3,})(.*)$/)
      if (fence) {
        isFencedCode = !isFencedCode

        return (
          escapeHTML(fence[1] ?? "") +
          span(codeEditorTheme.syntax.marker, fence[2] ?? "") +
          span(codeEditorTheme.syntax.link, fence[3] ?? "")
        )
      }

      if (isFencedCode) return span(codeEditorTheme.syntax.code, line)

      const heading = line.match(/^(\s{0,3})(#{1,6})([ \t].*)$/)
      if (heading) {
        return (
          escapeHTML(heading[1] ?? "") +
          span(codeEditorTheme.syntax.marker, heading[2] ?? "") +
          highlightInlineMarkdown(heading[3] ?? "")
        )
      }

      const blockquote = line.match(/^(\s{0,3}>+)([ \t]?.*)$/)
      if (blockquote) {
        return (
          span(codeEditorTheme.syntax.marker, blockquote[1] ?? "") +
          highlightInlineMarkdown(blockquote[2] ?? "")
        )
      }

      const list = line.match(/^(\s*)([*+-]|\d+[.)])([ \t]+.*)$/)
      if (list) {
        return (
          escapeHTML(list[1] ?? "") +
          span(codeEditorTheme.syntax.marker, list[2] ?? "") +
          highlightInlineMarkdown(list[3] ?? "")
        )
      }

      const thematicBreak = line.match(/^(\s{0,3})([*_-])(?:[ \t]*\2){2,}\s*$/)
      if (thematicBreak) return span(codeEditorTheme.syntax.marker, line)

      return highlightInlineMarkdown(line)
    })
    .join("\n")
}

export const MarkdownEditor: Component<{
  box: MarkdownEditorBox
  cameraScale: number
  onCancel: () => void
  onCommit: (markdown: string) => void
  placeholder: string
  value: string
}> = props => {
  let editor: HTMLTextAreaElement | undefined
  let highlighter: HTMLPreElement | undefined
  const [draft, setDraft] = createSignal("")

  createEffect(() => {
    setDraft(props.value)
  })

  const highlightedDraft = createMemo(() => highlightMarkdown(draft()))

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

  return (
    <div
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
