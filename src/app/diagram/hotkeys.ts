import hotkeys from "hotkeys-js"
import {
  isEdgeID,
  isNodeID,
  patching,
  type EdgeID,
  type NodeID,
} from "./data/data"
import { setStore, store } from "./data/state"

export const setupHotkeys = (): VoidFunction => {
  hotkeys("Delete, Backspace", () => {
    patching(store.data, d => {
      for (const id in store.selected) {
        if (isNodeID(id)) {
          delete d.nodes[id]
        } else if (isEdgeID(id)) {
          delete d.edges[id]
        }
      }
    })
  })

  hotkeys("Escape", () => {
    setStore({ selected: {} })
  })

  hotkeys("Enter", () => {
    const arr = Object.keys(store.selected) as ReadonlyArray<NodeID | EdgeID>
    if (arr.length === 1) {
      setStore({ editing: arr[0] })
      return false
    }
  })

  return () => hotkeys.unbind()
}
