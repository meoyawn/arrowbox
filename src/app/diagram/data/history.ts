import { type Patch } from "immer"

export interface ImmerHistory {
  index: number
  forward: Array<ReadonlyArray<Patch>>
  backward: Array<ReadonlyArray<Patch>>
}

export const emptyHistory = (): ImmerHistory => ({
  index: -1,
  forward: [],
  backward: [],
})
