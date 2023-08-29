export const isEl = (el: unknown): el is Element & HTMLOrSVGElement =>
  el instanceof Element
