/**
 * Modulate a value between two ranges.
 *
 * @example
 *
 * ```ts
 * const A = modulate(0, [0, 1], [0, 100])
 * ```
 *
 * @param value - The interpolation value.
 * @param rangeA - From [low, high]
 * @param rangeB - To [low, high]
 * @param clamp - Whether to clamp the result to [low, high]
 * @public
 */
export const modulate = (
  value: number,
  [fromLow, fromHigh]: readonly [number, number],
  [v0, v1]: readonly [number, number],
  clamp = false,
): number => {
  const result = v0 + ((value - fromLow) / (fromHigh - fromLow)) * (v1 - v0)
  return clamp
    ? v0 < v1
      ? Math.max(Math.min(result, v1), v0)
      : Math.max(Math.min(result, v0), v1)
    : result
}
