import { toaster } from "@kobalte/core"
import hotkeys from "hotkeys-js"
import { toKeysArray, toKeySet } from "../../lib/ts.ts"
import { ExternalA } from "../ExternalA.tsx"
import { AbToast } from "../Toasts.tsx"
import { isNodeID } from "./data/data.ts"
import { layoutGraph } from "./data/elk.ts"
import { patching, redo, undo } from "./data/history.ts"
import { toMermaid } from "./data/mermaid/stringify.ts"
import { ROOT_ID } from "./data/ROOT_ID.ts"
import { setStore, store } from "./data/state.ts"
import { del, setRect, ungroup } from "./data/transactions.ts"

interface Hotkey {
  label: string
  hotkey: string
}

export const hotkeyTable = {
  del: { label: "Delete", hotkey: "Delete, Backspace" },
  undo: { label: "Undo", hotkey: "ctrl+z, command+z" },
  redo: { label: "Redo", hotkey: "ctrl+shift+z, command+shift+z" },
  selectAll: { label: "Select All", hotkey: "ctrl+a, command+a" },
  layout: { label: "Layout", hotkey: "L" },
  group: { label: "Group", hotkey: "ctrl+g, command+g" },
  ungroup: { label: "Ungroup", hotkey: "ctrl+shift+g, command+shift+g" },
  copyMermaid: { label: "Copy Mermaid", hotkey: "M" },
} as const satisfies Record<string, Hotkey>

export const setupHotkeys = (): VoidFunction => {
  hotkeys(hotkeyTable.del.hotkey, () =>
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

  hotkeys(hotkeyTable.undo.hotkey, e => {
    e.preventDefault()

    setStore(({ tree }) => ({ tree: undo(tree) }))
  })

  hotkeys(hotkeyTable.redo.hotkey, e => {
    e.preventDefault()

    setStore(({ tree }) => ({ tree: redo(tree) }))
  })

  hotkeys(hotkeyTable.group.hotkey, e => {
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

  hotkeys(hotkeyTable.ungroup.hotkey, e => {
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

  hotkeys(hotkeyTable.selectAll.hotkey, e => {
    e.preventDefault()

    setStore(({ tree }) => ({
      selected: toKeySet([
        ...toKeysArray(tree.data.nodes).filter(x => x !== ROOT_ID),
        ...toKeysArray(tree.data.edges),
      ]),
    }))
  })

  let layingOut = false
  hotkeys(hotkeyTable.layout.hotkey, () => {
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

  hotkeys(hotkeyTable.copyMermaid.hotkey, () => {
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
