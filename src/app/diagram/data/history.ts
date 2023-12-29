import {
  applyPatches,
  enablePatches,
  produce,
  produceWithPatches,
  setAutoFreeze,
  type Patch,
} from "immer"
import { type NodesEdges } from "./data"
import { buildIndex } from "./indexing"
import { type DataState } from "./state"

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

export function patching(
  { data, history }: DataState,
  fn: (d: NodesEdges) => void,
): DataState {
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

export function undo({ data, history }: DataState): DataState {
  const patch = history.backward[history.index]
  const prev = applyPatches(data, patch)
  return {
    data: prev,
    index: buildIndex(prev),
    history: { ...history, index: history.index - 1 },
  }
}

export function redo({ data, history }: DataState): DataState {
  const patch = history.forward[history.index]
  const next = applyPatches(data, patch)
  return {
    data: next,
    index: buildIndex(next),
    history: { ...history, index: history.index + 1 },
  }
}
