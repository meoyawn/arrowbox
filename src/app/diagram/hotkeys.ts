import hotkeys from "hotkeys-js"
import { toArr, toSet } from "../../lib/ts.ts"
import { isNodeID, rootID } from "./data/data.ts"
import { patching, redo, undo } from "./data/history.ts"
import { setStore, store } from "./data/state.ts"
import { del, ungroup } from "./data/transactions.ts"

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

  hotkeys("ctrl+z, command+z", e => {
    e.preventDefault()

    setStore(({ tree }) => ({ tree: undo(tree) }))
  })

  hotkeys("ctrl+shift+z, command+shift+z", e => {
    e.preventDefault()

    setStore(({ tree }) => ({ tree: redo(tree) }))
  })

  // group
  hotkeys("ctrl+g, command+g", e => {
    e.preventDefault()

    const selected = toArr(store.selected)
    if (selected.length === 0) return

    setStore(s => ({
      tree: patching(s.tree, g => {
        throw new Error(`TODO group selected ${JSON.stringify(g)}`)
      }),
    }))
  })

  // ungroup
  hotkeys("ctrl+shift+g, command+shift+g", e => {
    e.preventDefault()

    const selected = toArr(store.selected)
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

  hotkeys("ctrl+a, command+a", e => {
    e.preventDefault()

    setStore(({ tree }) => ({
      selected: toSet([
        ...toArr(tree.data.nodes).filter(x => x !== rootID),
        ...toArr(tree.data.edges),
      ]),
    }))
  })

  return () => hotkeys.unbind()
}
