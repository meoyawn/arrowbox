import {
  applyPatches,
  enablePatches,
  produce,
  produceWithPatches,
  setAutoFreeze,
  type Patch,
} from "immer"
import { type DataState, type NodesEdges } from "./data"
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

export const patching = (
  { data, history }: DataState,
  fn: (d: NodesEdges) => void,
): DataState => {
  const [next, fwd, bwd] = produceWithPatches(data, fn)

  return {
    data: next,
    history: {
      forward: [...history.forward, fwd],
      backward: [...history.backward, bwd],
      index: history.index + 1,
    },
    index: buildIndex(next),
  }
}

export const nonPatching = (
  s: DataState,
  fn: (d: NodesEdges) => void,
): DataState => ({ ...s, data: produce(s.data, fn) })

export const undo = (ds: DataState): DataState => {
  const { data, history } = ds
  if (history.index < 0) return ds

  const patch = history.backward[history.index]

  const prev = applyPatches(data, patch)
  return {
    data: prev,
    index: buildIndex(prev),
    history: { ...history, index: history.index - 1 },
  }
}

export const redo = (ds: DataState): DataState => {
  const { data, history } = ds
  const index = history.index + 1
  if (index >= history.forward.length) return ds

  const patch = history.forward[index]

  const next = applyPatches(data, patch)
  return {
    data: next,
    index: buildIndex(next),
    history: { ...history, index },
  }
}
