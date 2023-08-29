export const lazy = <T>(fn: () => T): (() => T) => {
  let val: T | undefined

  return () => {
    if (!val) {
      val = fn()
    }
    return val
  }
}
