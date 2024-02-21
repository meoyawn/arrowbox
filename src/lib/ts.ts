export function memoize<T>(fn: () => T): () => T {
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
export type KeySet<T extends keyof never> = Partial<Record<T, true | 1>>

export const toKeySet = <T extends keyof never>(arr: readonly T[]): KeySet<T> =>
  Object.fromEntries(arr.map(x => [x, 1])) as KeySet<T>

export const toKeysArray = <T extends keyof never>(
  obj: Partial<Record<T, unknown>>,
): readonly T[] => Object.keys(obj) as T[]
