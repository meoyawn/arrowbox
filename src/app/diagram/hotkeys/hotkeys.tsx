import { toaster } from "@kobalte/core"
import hotkeys from "hotkeys-js"
import { toKeySet, toKeysArray } from "../../../lib/ts.ts"
import { AbToast } from "../../Toasts.tsx"
import { ExternalA } from "../../components.tsx"
import { ROOT_ID } from "../data/ROOT_ID.ts"
import { isNodeID } from "../data/data.ts"
import { layoutGraph } from "../data/elk.ts"
import { patching, redo, undo } from "../data/history.ts"
import { toMermaid } from "../data/mermaid/stringify.ts"
import { setStore, store } from "../data/state.ts"
import { del, setRect, ungroup } from "../data/transactions.ts"

export type Shortcut =
  | { windows: `Ctrl+${string}`; macos: `⌘+${string}` }
  | { hotkey: string }

export type LabeledShortcut = Shortcut & { label: string }

const toKey = (x: Shortcut) =>
  "hotkey" in x ? x.hotkey : `${x.windows}, ${x.macos}`

export const Shortcuts = {
  del: { label: "Delete", hotkey: "Delete, Backspace" },
  layout: { label: "Auto layout", hotkey: "L" },
  copyMermaid: { label: "Copy Mermaid", hotkey: "M" },

  undo: { label: "Undo", windows: "Ctrl+Z", macos: "⌘+Z" },
  redo: { label: "Redo", windows: "Ctrl+⇧+Z, Ctrl+Y", macos: "⌘+⇧+Z" },
  selectAll: { label: "Select All", windows: "Ctrl+A", macos: "⌘+A" },
  group: { label: "Group selected", windows: "Ctrl+G", macos: "⌘+G" },
  ungroup: { label: "Ungroup", windows: "Ctrl+⇧+G", macos: "⌘+⇧+G" },
} as const satisfies Record<string, LabeledShortcut>

export const setupHotkeys = (): VoidFunction => {
  hotkeys(toKey(Shortcuts.del), () =>
    setStore(s => ({
      tree: patching(s.tree, d => del(d, s.tree.index, s.selected)),
      selected: {},
    })),
  )

  hotkeys("Escape", () => setStore({ selected: {} }))

  hotkeys("Enter", () => {
    const arr = toKeysArray(store.selected)
    if (arr.length === 1) {
      const [editing] = arr
      setStore({ editing })

      // WTF is this?
      return false
    }
  })

  hotkeys(toKey(Shortcuts.undo), e => {
    e.preventDefault()

    setStore(({ tree }) => ({ tree: undo(tree) }))
  })

  hotkeys(toKey(Shortcuts.redo), e => {
    e.preventDefault()

    setStore(({ tree }) => ({ tree: redo(tree) }))
  })

  hotkeys(toKey(Shortcuts.group), e => {
    e.preventDefault()

    toaster.show(props => (
      <AbToast toastId={props.toastId}>Grouping isn't implemented yet</AbToast>
    ))
    // const selected = toKeysArray(store.selected)
    // if (selected.length === 0) return
    //
    // setStore(s => ({
    //   tree: patching(s.tree, g => {
    //     throw new Error(`TODO group selected ${JSON.stringify(g)}`)
    //   }),
    // }))
  })

  hotkeys(toKey(Shortcuts.ungroup), e => {
    e.preventDefault()

    const selected = toKeysArray(store.selected)
    if (selected.length !== 1) return

    const [id] = selected
    if (!isNodeID(id)) return
    if (!store.tree.data.nodes[id].children.length) return

    setStore({
      tree: patching(store.tree, ({ nodes }) =>
        ungroup(nodes, store.tree.index.parents, id),
      ),
    })
  })

  hotkeys(toKey(Shortcuts.selectAll), e => {
    e.preventDefault()

    setStore(({ tree }) => ({
      selected: toKeySet([
        ...toKeysArray(tree.data.nodes).filter(x => x !== ROOT_ID),
        ...toKeysArray(tree.data.edges),
      ]),
    }))
  })

  let layingOut = false
  hotkeys(toKey(Shortcuts.layout), () => {
    if (layingOut) return

    layingOut = true
    void layoutGraph(store.tree.data).then(dag => {
      layingOut = false

      setStore(({ tree }) => ({
        tree: patching(tree, ({ nodes }) => {
          setRect(nodes, dag)
        }),
      }))
    })
  })

  hotkeys(toKey(Shortcuts.copyMermaid), () => {
    void navigator.clipboard
      .writeText(toMermaid(store.tree.data, store.title))
      .then(() => {
        toaster.show(props => (
          <AbToast toastId={props.toastId}>
            <p>Copied Mermaid diagram</p>
            <ExternalA href="https://mermaid.live/edit">Open Editor</ExternalA>
          </AbToast>
        ))
      })
  })

  return () => hotkeys.unbind()
}
