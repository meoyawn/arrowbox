import { drag, type D3DragEvent } from "d3-drag"
import { select } from "d3-selection"
import { zoom, zoomIdentity, type D3ZoomEvent } from "d3-zoom"
import { createEffect, createSignal, Show, type Component } from "solid-js"
import { svgTransform2 } from "../../lib/dom.ts"

interface Point {
  x: number
  y: number
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const NestedDrag: Component = () => {
  let outer: SVGSVGElement
  let inner: SVGGElement

  const [camera, setCamera] = createSignal(zoomIdentity)
  const [rectPos, setRectPos] = createSignal([50, 50])
  const [brush, setBrush] = createSignal<Rect | null>(null)

  createEffect(() => {
    const zm = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 8])
      .filter((ev: UIEvent) => (ev instanceof WheelEvent ? ev.ctrlKey : true))
      .on("zoom", (e: D3ZoomEvent<SVGSVGElement, unknown>) =>
        setCamera(e.transform),
      )

    // brush
    const dragOuter = drag<SVGSVGElement, unknown>()
      .subject((e: D3DragEvent<Element, unknown, Point>) => {
        const se = e.sourceEvent as Event
        return se.target instanceof SVGRectElement ? undefined : e
      })
      .on("drag", (e: D3DragEvent<Element, unknown, Point>) =>
        setBrush({
          x: Math.min(e.subject.x, e.x),
          y: Math.min(e.subject.y, e.y),
          width: Math.abs(e.x - e.subject.x),
          height: Math.abs(e.y - e.subject.y),
        }),
      )
      .on("end", () => setBrush(null))

    // rects
    const dragInner = drag<SVGGElement, unknown>()
      .container(inner)
      .subject((_: D3DragEvent<Element, unknown, unknown>) => {
        const [x, y] = rectPos()
        return { x, y }
      })
      .on("drag", (e: D3DragEvent<Element, unknown, unknown>) =>
        setRectPos([e.x, e.y]),
      )

    select(outer).call(dragOuter).call(zm)
    select(inner).call(dragInner)
  })

  return (
    <svg
      ref={x => (outer = x)}
      class="min-h-screen w-full overscroll-x-none"
      onWheel={e => {
        e.preventDefault()
        e.stopPropagation()
        setCamera(camera().translate(-e.deltaX, -e.deltaY))
      }}
    >
      <g ref={x => (inner = x)} transform={svgTransform2(camera())}>
        <rect
          fill="black"
          x={rectPos()[0]}
          y={rectPos()[1]}
          width={500}
          height={500}
        />
      </g>

      <Show when={brush()}>
        {r => (
          <rect
            fill="blue"
            x={r().x}
            y={r().y}
            width={r().width}
            height={r().height}
          />
        )}
      </Show>
    </svg>
  )
}
