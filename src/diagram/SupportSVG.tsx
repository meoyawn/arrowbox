import { scaleLinear, type ScaleLinear } from "d3-scale"
import { select } from "d3-selection"
import { zoom, zoomIdentity, type ZoomTransform } from "d3-zoom"
import { createEffect, createMemo, type JSX } from "solid-js"
import { createStore } from "solid-js/store"

const ArrowEnd = ({ fill, id }: { id: string; fill: string }): JSX.Element => (
  <marker
    id={id}
    viewBox="0 0 10 10"
    refX="9"
    refY="5"
    markerUnits="userSpaceOnUse"
    markerWidth="10"
    markerHeight="10"
    orient="auto"
  >
    <polygon points="0 0 10 5 0 10 2 5" fill={fill} stroke="none" />
  </marker>
)

const ArrowStart = ({
  fill,
  id,
}: {
  id: string
  fill: string
}): JSX.Element => (
  <marker
    id={id}
    viewBox="0 0 10 10"
    refY="5"
    markerUnits="userSpaceOnUse"
    markerWidth="10"
    markerHeight="10"
    orient="auto"
  >
    <polygon points="10 0 -1 5 10 10 8 5" fill={fill} stroke="none" />
  </marker>
)

export const [store, setStore] = createStore({
  transform: zoomIdentity,
})

const d3Zoom = zoom<HTMLElement, unknown>()
  .scaleExtent([0.1, 10])
  .filter(({ target, type }: UIEvent) => {
    if (type !== "mousedown") return true

    return !(target instanceof HTMLTextAreaElement)
  })
  .on("zoom", ({ transform }) =>
    setStore("transform", transform as ZoomTransform),
  )

export const zoomTo = (root: HTMLElement, t: ZoomTransform): void =>
  d3Zoom.transform(select(root), t)

const extracted = (
  height: number,
  width: number,
  transform: ZoomTransform,
): Readonly<{
  x: number
  width: number
  y: number
  height: number
}> => {
  const k = height / width

  const xx: ScaleLinear<number, number> = scaleLinear([0, 1], [0, width])
  const yy: ScaleLinear<number, number> = scaleLinear([0, k], [0, height])

  const scaleX = transform.rescaleX(xx)
  const scaleY = transform.rescaleY(yy)

  const [tx1, tx2] = scaleX.ticks(width / 40)
  const [ty1, ty2] = scaleY.ticks(height / 40)

  const x = scaleX(tx1)
  const y = scaleY(ty1)

  return {
    x,
    y,
    width: scaleX(tx2) - x,
    height: scaleY(ty2) - y,
  }
}

export const SupportingSVG = (): JSX.Element => {
  const foo = createMemo(() =>
    extracted(window.screen.height, window.screen.width, store.transform),
  )

  createEffect(() => {
    const selection = select(htmlRoot())
    selection.call(d3Zoom).on("dblclick.zoom", null)
    d3Zoom.transform(selection, useStore.getState().transform)
    return () => {
      selection.on(".zoom", null)
    }
  })

  return (
    <svg class="pointer-events-none absolute h-full w-full">
      <defs>
        <pattern id="circle_pattern" patternUnits="userSpaceOnUse" {...foo}>
          <circle cx={2} cy={2} r={1.5} fill="black" fill-opacity={0.15} />
        </pattern>
      </defs>

      <rect width={window.screen.width} height={window.screen.height} />
    </svg>
  )
}
