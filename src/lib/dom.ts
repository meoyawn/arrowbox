export const isEl = (el: unknown): el is Element & HTMLOrSVGElement =>
  el instanceof Element

export const dataset = (el: unknown): DOMStringMap | undefined =>
  isEl(el) ? el.dataset : undefined

export const svgTransform2 = ({
  k,
  x,
  y,
}: {
  x: number
  y: number
  k?: number
}): string => `translate(${x} ${y})` + (k ? ` scale(${k})` : "")
