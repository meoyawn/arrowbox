export const memoize = <T>(fn: () => T): (() => T) => {
  let val: T | undefined

  return () => {
    if (!val) {
      val = fn()
    }
    return val
  }
}

/** serializable set */
export type RSet<T extends keyof never> = Partial<Record<T, true | 1>>

export const rset = <T extends keyof never>(arr: ReadonlyArray<T>): RSet<T> =>
  Object.fromEntries(arr.map(x => [x, 1])) as RSet<T>
