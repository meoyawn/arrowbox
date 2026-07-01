import {
  applyPatches,
  enablePatches,
  produce,
  produceWithPatches,
  setAutoFreeze,
  type Patch,
} from "immer"
import { unwrap } from "solid-js/store"
import type { DataState, Graph } from "./data"
import { buildIndex } from "./indexing"

enablePatches()
setAutoFreeze(false)

export interface ImmerHistory {
  index: number
  forward: ReadonlyArray<Array<Patch>>
  backward: ReadonlyArray<Array<Patch>>
}

export const emptyHistory = (): ImmerHistory => ({
  index: -1,
  forward: [],
  backward: [],
})

/** removing solid store proxy's circular references before passing to immer */
const clean = <T>(t: T): T => structuredClone(unwrap(t))

export function patching(ds: DataState, fn: (d: Graph) => void): DataState {
  const { data, history } = ds
  const [next, fwd, bwd] = produceWithPatches(clean(data), fn)
  if (!fwd.length) return ds

  return {
    data: next,
    history: {
      forward: [...history.forward, fwd],
      backward: [...history.backward, bwd],
      index: history.index + 1,
    },
    index: buildIndex(next, ds.index),
  }
}

export const nonPatching = (
  s: DataState,
  fn: (d: Graph) => void,
): DataState => ({ ...s, data: produce(clean(s.data), fn) })

export const undo = (ds: DataState): DataState => {
  const { data, history } = ds
  if (history.index < 0) return ds

  const patch = history.backward[history.index]
  if (!patch.length) throw new Error("empty patch")

  const prev = applyPatches(clean(data), patch)

  return {
    data: prev,
    index: buildIndex(prev, ds.index),
    history: { ...history, index: history.index - 1 },
  }
}

export const redo = (ds: DataState): DataState => {
  const { data, history } = ds
  const index = history.index + 1
  if (index >= history.forward.length) return ds

  const patch = history.forward[index]
  if (!patch.length) throw new Error("empty patch")

  const next = applyPatches(clean(data), patch)

  return {
    data: next,
    index: buildIndex(next, ds.index),
    history: { ...history, index },
  }
}
