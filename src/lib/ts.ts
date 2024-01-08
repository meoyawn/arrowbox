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
export type RSet<T extends keyof never> = Partial<Record<T, true>>
