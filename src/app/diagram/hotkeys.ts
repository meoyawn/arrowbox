import hotkeys from "hotkeys-js"
import type { EdgeID, NodeID } from "./data/data.ts"
import { patching, redo, undo } from "./data/history.ts"
import { setStore, store } from "./data/store.ts"
import { del } from "./data/transactions.ts"

export const setupHotkeys = (): VoidFunction => {
  hotkeys("Delete, Backspace", () =>
    setStore(s => ({
      tree: patching(s.tree, d => del(d, s.tree.index, s.selected)),
      selected: {},
    })),
  )

  hotkeys("Escape", () => setStore({ selected: {} }))

  hotkeys("Enter", () => {
    const arr = Object.keys(store.selected) as Array<NodeID | EdgeID>
    if (arr.length === 1) {
      setStore({ editing: arr[0] })

      // WTF is this?
      return false
    }
  })

  hotkeys("ctrl+z, command+z", () =>
    setStore(({ tree }) => ({ tree: undo(tree) })),
  )

  hotkeys("ctrl+shift+z, command+shift+z", () =>
    setStore(({ tree }) => ({ tree: redo(tree) })),
  )

  return () => hotkeys.unbind()
}
