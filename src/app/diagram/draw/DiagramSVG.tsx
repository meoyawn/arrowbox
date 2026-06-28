import { pointer, select, type Selection } from "d3-selection"
import {
  type D3ZoomEvent,
  zoom,
  zoomIdentity,
  type ZoomTransform,
} from "d3-zoom"
import type { BBox } from "rbush"
import { type Component, createEffect, For, onCleanup, Show } from "solid-js"
import { toKeysArray } from "../../../lib/ts.ts"
import type { EdgeID, NodeID } from "../data/data.ts"
import { createAnchors } from "../data/edge-anchor.ts"
import { patching } from "../data/history.ts"
import { ROOT_ID } from "../data/ROOT_ID.ts"
import { type DraggingArrow, setStore, store } from "../data/state.ts"
import { addNode } from "../data/transactions.ts"
import { behaviorDrag, worldDragSubj } from "../drag.ts"
import { DotGrid } from "./DotGrid.tsx"
import { OneEdge } from "./OneEdge.tsx"
import { OneNode } from "./OneNode.tsx"
import { SvgDefs } from "./SvgDefs.tsx"

interface Point {
  x: number
  y: number
}

interface TouchGesture {
  camera: ZoomTransform
  center: Point
  distance: number
}

const zoomScaleExtent: [number, number] = [0.05, 8]

let currentCamera = zoomIdentity
let cameraFrame = 0
let canvasSelection:
  | Selection<SVGSVGElement, unknown, null, undefined>
  | undefined

function commitCamera(camera: ZoomTransform): void {
  currentCamera = camera

  if (cameraFrame) return

  cameraFrame = requestAnimationFrame(() => {
    cameraFrame = 0
    setStore({ camera: currentCamera })
  })
}

function cancelCameraCommit(): void {
  if (!cameraFrame) return

  cancelAnimationFrame(cameraFrame)
  cameraFrame = 0
}

const clampZoomScale = (scale: number): number =>
  Math.min(zoomScaleExtent[1], Math.max(zoomScaleExtent[0], scale))

const distance = (a: Point, b: Point): number =>
  Math.hypot(a.x - b.x, a.y - b.y)

const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
})

export function touchGestureCamera(
  start: TouchGesture,
  center: Point,
  distance: number,
): ZoomTransform {
  const k = clampZoomScale(start.camera.k * (distance / start.distance))
  const [worldX, worldY] = start.camera.invert([start.center.x, start.center.y])

  return zoomIdentity
    .translate(center.x, center.y)
    .scale(k)
    .translate(-worldX, -worldY)
}

function touchPoint(touch: Touch, svgEl: SVGSVGElement): Point {
  const rect = svgEl.getBoundingClientRect()

  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  }
}

function touchGesture(
  ev: TouchEvent,
  svgEl: SVGSVGElement,
): TouchGesture | null {
  if (ev.touches.length !== 2) return null

  const touchA = ev.touches.item(0)
  const touchB = ev.touches.item(1)
  if (!touchA || !touchB) return null

  const a = touchPoint(touchA, svgEl)
  const b = touchPoint(touchB, svgEl)

  return {
    camera: currentCamera,
    center: midpoint(a, b),
    distance: distance(a, b),
  }
}

const d3Zoom = zoom<SVGSVGElement, unknown>()
  .scaleExtent(zoomScaleExtent)
  .filter((ev: UIEvent) => (ev instanceof WheelEvent ? ev.ctrlKey : true))
  .on("zoom", (e: D3ZoomEvent<Element, unknown>) => {
    commitCamera(e.transform)
  })

/** svg.dataset not working in safari/firefox */
export const closestNodeID = (el: Element): NodeID | null =>
  el.closest("[data-nodeID]")?.getAttribute("data-nodeID") as NodeID

/** svg.dataset not working in safari/firefox */
export const closestEdgeID = (el: Element): EdgeID | null =>
  el.closest("[data-edgeID]")?.getAttribute("data-edgeID") as EdgeID

export function zoomTo(t: ZoomTransform): void {
  currentCamera = t
  if (canvasSelection) d3Zoom.transform(canvasSelection, t)
  else setStore({ camera: t })
}

const zoomTransform = ({ k, x, y }: ZoomTransform): string =>
  `translate(${x} ${y}) scale(${k})`

export const DiagramSVG: Component = () => {
  let svgEl: SVGSVGElement | undefined
  let zoomedEl: SVGGElement | undefined
  let editorLayerEl: HTMLDivElement | undefined

  createEffect(() => {
    currentCamera = store.camera
  })

  createEffect(() => {
    if (!svgEl || !zoomedEl) return

    const canvas = svgEl
    const svg = select<SVGSVGElement, unknown>(canvas)
    canvasSelection = svg
    const drag = behaviorDrag(worldDragSubj, zoomedEl) as unknown as (
      selection: typeof svg,
    ) => void
    const applyZoom = d3Zoom as unknown as (selection: typeof svg) => void
    drag(svg)
    applyZoom(svg)
    svg.on("dblclick.zoom", null).on("mousedown.zoom", null)

    let touchStart: TouchGesture | null = null

    function preventPageZoom(ev: WheelEvent): void {
      if (ev.ctrlKey) ev.preventDefault()
    }

    function preventGesture(ev: Event): void {
      ev.preventDefault()
    }

    function handleTouchStart(ev: TouchEvent): void {
      touchStart = touchGesture(ev, canvas)
      if (!touchStart) return

      ev.preventDefault()
      ev.stopImmediatePropagation()
    }

    function handleTouchZoomMove(ev: TouchEvent): void {
      if (!touchStart) return

      const current = touchGesture(ev, canvas)
      if (!current) return

      ev.preventDefault()
      ev.stopImmediatePropagation()
      zoomTo(touchGestureCamera(touchStart, current.center, current.distance))
    }

    function handleTouchMove(ev: TouchEvent): void {
      handleTouchZoomMove(ev)
    }

    function handleTouchEnd(ev: TouchEvent): void {
      if (ev.touches.length >= 2) {
        touchStart = touchGesture(ev, canvas)
      } else {
        touchStart = null
      }
    }

    canvas.addEventListener("wheel", preventPageZoom, {
      capture: true,
      passive: false,
    })
    canvas.addEventListener("gesturestart", preventGesture, {
      capture: true,
      passive: false,
    })
    canvas.addEventListener("gesturechange", preventGesture, {
      capture: true,
      passive: false,
    })
    canvas.addEventListener("touchstart", handleTouchStart, {
      capture: true,
      passive: false,
    })
    canvas.addEventListener("touchmove", handleTouchMove, {
      capture: true,
      passive: false,
    })
    canvas.addEventListener("touchend", handleTouchEnd, {
      capture: true,
      passive: false,
    })
    canvas.addEventListener("touchcancel", handleTouchEnd, {
      capture: true,
      passive: false,
    })
    onCleanup(() => {
      canvas.removeEventListener("wheel", preventPageZoom, true)
      canvas.removeEventListener("gesturestart", preventGesture, true)
      canvas.removeEventListener("gesturechange", preventGesture, true)
      canvas.removeEventListener("touchstart", handleTouchStart, true)
      canvas.removeEventListener("touchmove", handleTouchMove, true)
      canvas.removeEventListener("touchend", handleTouchEnd, true)
      canvas.removeEventListener("touchcancel", handleTouchEnd, true)
      cancelCameraCommit()
      if (canvasSelection === svg) canvasSelection = undefined
    })
  })

  return (
    <div class="relative min-h-screen w-full overflow-hidden overscroll-none">
      <DotGrid camera={store.camera} />

      <svg
        id="canvas"
        ref={svgEl}
        aria-label="Diagram canvas"
        class="absolute inset-0 h-full min-h-screen w-full touch-none overscroll-none outline-none"
        role="button"
        tabIndex={0}
        onWheel={ev => {
          ev.preventDefault()

          if (ev.ctrlKey) return

          zoomTo(
            currentCamera.translate(
              -ev.deltaX / currentCamera.k,
              -ev.deltaY / currentCamera.k,
            ),
          )
        }}
        onFocus={({ target }) => {
          setStore({ hovering: closestNodeID(target) })
        }}
        onMouseOver={({ target }) => {
          setStore({ hovering: closestNodeID(target) })
        }}
        onKeyDown={ev => {
          if (ev.key === "Escape") setStore({ selected: {} })
        }}
        onDblClick={e => {
          if (!zoomedEl) return

          const target = e.target
          const nid = closestNodeID(target)
          const eid = closestEdgeID(target)
          const editing = nid ?? eid
          if (editing) {
            setStore({ editing })
          } else {
            const world = pointer(e, zoomedEl)
            setStore(s => {
              let editing: NodeID | undefined
              return {
                tree: patching(s.tree, x => {
                  editing = addNode(x, world)
                }),
                editing,
              }
            })
          }
        }}
        onClick={ev => {
          const target = ev.target
          const nid = closestNodeID(target)
          const eid = closestEdgeID(target)
          const selected = nid ?? eid
          if (selected) {
            setStore({
              selected:
                ev.ctrlKey || ev.metaKey
                  ? { ...store.selected, [selected]: true }
                  : ({ [selected]: true } as const),
            })
          } else {
            setStore({ selected: {} })
          }
        }}
      >
        <SvgDefs />

        <g ref={zoomedEl} transform={zoomTransform(store.camera)}>
          <For each={store.tree.data.nodes[ROOT_ID].children}>
            {id => <OneNode editorLayer={() => editorLayerEl} id={id} />}
          </For>
          <For
            each={toKeysArray(store.tree.data.edges).filter(
              eid => !store.dragging || !(eid in store.dragging),
            )}
          >
            {e => <OneEdge editorLayer={() => editorLayerEl} id={e} />}
          </For>

          <Show when={store.brush}>{b => <BrushRect bbox={b()} />}</Show>
          <Show when={store.newArrow}>
            {a => <NewArrowC from={a().from} to={a().to} />}
          </Show>
        </g>
      </svg>

      <div
        ref={editorLayerEl}
        data-testid="foreign-text-editor-layer"
        class="pointer-events-none absolute inset-0 z-10 min-h-screen w-full overflow-visible"
      />
    </div>
  )
}

/**
 * TODO:
 * - respect shape
 * - respect absolute coordinates
 */
const NewArrowC: Component<DraggingArrow> = props => {
  const from = () => props.from
  const to = () => props.to
  const { fromX, fromY, toX, toY } = createAnchors(store, from, to)

  return (
    <line
      x1={fromX()}
      y1={fromY()}
      x2={toX()}
      y2={toY()}
      stroke={"black"}
      stroke-width={2}
      marker-end="url(#triangle)"
    />
  )
}

const BrushRect: Component<{ bbox: BBox }> = props => (
  <rect
    class="pointer-events-none"
    x={props.bbox.minX}
    y={props.bbox.minY}
    width={props.bbox.maxX - props.bbox.minX}
    height={props.bbox.maxY - props.bbox.minY}
    fill="#0000FF80"
  />
)
