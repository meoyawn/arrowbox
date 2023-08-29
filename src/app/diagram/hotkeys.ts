import hotkeys from "hotkeys-js"
import { isEdgeID, isNodeID, patch } from "./data/data"
import { store } from "./data/state"

export const setupHotkeys = (): void => {
  hotkeys("delete, backspace", () => {
    patch(store.data, store.history, d => {
      for (const id in store.selected) {
        if (isNodeID(id)) {
          delete d.nodes[id]
        } else if (isEdgeID(id)) {
          delete d.edges[id]
        }
      }
    })
  })
}
