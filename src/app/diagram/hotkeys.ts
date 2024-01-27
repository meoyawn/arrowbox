import hotkeys from "hotkeys-js"
import { toArr } from "../../lib/ts.ts"
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
    const arr = toArr(store.selected)
    if (arr.length === 1) {
      const [editing] = arr
      setStore({ editing })

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
