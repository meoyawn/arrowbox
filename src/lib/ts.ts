export const memoize = <T>(fn: () => T): (() => T) => {
  let val: T | undefined

  return () => {
    if (!val) {
      val = fn()
    }
    return val
  }
}

/**
 * because https://docs.solidjs.com/references/api-reference/stores/using-stores#createstore
 *
 * Also JSON
 */
export type RSet<T extends keyof never> = Partial<Record<T, true | 1>>

export const toSet = <T extends keyof never>(arr: readonly T[]): RSet<T> =>
  Object.fromEntries(arr.map(x => [x, 1])) as RSet<T>

export const toArr = <T extends keyof never>(
  obj: Partial<Record<T, unknown>>,
): readonly T[] => Object.keys(obj) as T[]
