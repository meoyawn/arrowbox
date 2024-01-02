import hotkeys from "hotkeys-js"
import { setStore, store } from "./2/store.ts"
import { redo, undo } from "./data/history.ts"

export const setupHotkeys = (): VoidFunction => {
  // hotkeys("Delete, Backspace", () => {
  //   patching(store.data, d => {
  //     for (const id in store.selected) {
  //       if (isNodeID(id)) {
  //         delete d.nodes[id]
  //       } else if (isEdgeID(id)) {
  //         delete d.edges[id]
  //       }
  //     }
  //   })
  // })
  //
  // hotkeys("Escape", () => {
  //   setStore({ selected: {} })
  // })
  //
  // hotkeys("Enter", () => {
  //   const arr = Object.keys(store.selected) as Array<NodeID | EdgeID>
  //   if (arr.length === 1) {
  //     setStore({ editing: arr[0] })
  //     return false
  //   }
  // })
  //

  hotkeys("ctrl+z, command+z", () => {
    setStore(({ tree }) => ({ tree: undo(tree) }))
  })

  hotkeys("ctrl+shift+z, command+shift+z", () => {
    setStore(({ tree }) => ({ tree: redo(tree) }))
  })

  return () => hotkeys.unbind()
}
