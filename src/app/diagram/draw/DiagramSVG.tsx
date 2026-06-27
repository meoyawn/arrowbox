import { pointer, select } from "d3-selection"
import { type D3ZoomEvent, zoom, type ZoomTransform } from "d3-zoom"
import { type BBox } from "rbush"
import { type Component, createEffect, For, Show } from "solid-js"
import { toKeysArray } from "../../../lib/ts.ts"
import { type EdgeID, type NodeID } from "../data/data.ts"
import { createAnchors } from "../data/edge-anchor.ts"
import { patching } from "../data/history.ts"
import { ROOT_ID } from "../data/ROOT_ID.ts"
import { type DraggingArrow, setStore, store } from "../data/state.ts"
import { addNode } from "../data/transactions.ts"
import { behaviorDrag, worldDragSubj } from "../drag.ts"
import { OneEdge } from "./OneEdge.tsx"
import { OneNode } from "./OneNode.tsx"
import { SvgDefs } from "./SvgDefs.tsx"

const d3Zoom = zoom<SVGSVGElement, unknown>()
  .scaleExtent([0.05, 8])
  .filter((ev: UIEvent) => (ev instanceof WheelEvent ? ev.ctrlKey : true))
  .on("zoom", (e: D3ZoomEvent<Element, unknown>) =>
    setStore({ camera: e.transform }),
  )

/** svg.dataset not working in safari/firefox */
export const closestNodeID = (el: Element): NodeID | null =>
  el.closest("[data-nodeID]")?.getAttribute("data-nodeID") as NodeID

/** svg.dataset not working in safari/firefox */
export const closestEdgeID = (el: Element): EdgeID | null =>
  el.closest("[data-edgeID]")?.getAttribute("data-edgeID") as EdgeID

export function zoomTo(t: ZoomTransform): void {
  d3Zoom.transform(select("#canvas") as never, t)
}

const zoomTransform = ({ k, x, y }: ZoomTransform): string =>
  `translate(${x} ${y}) scale(${k})`

export const DiagramSVG: Component = () => {
  let svgEl: SVGSVGElement
  let zoomedEl: SVGGElement

  createEffect(() => {
    const svg = select<SVGSVGElement, unknown>(svgEl)
    const drag = behaviorDrag(worldDragSubj, zoomedEl) as unknown as (
      selection: typeof svg,
    ) => void
    const applyZoom = d3Zoom as unknown as (selection: typeof svg) => void
    drag(svg)
    applyZoom(svg)
    svg.on("dblclick.zoom", null).on("mousedown.zoom", null)
  })

  return (
    <svg
      id="canvas"
      ref={svgEl!}
      class="h-full min-h-screen w-full"
      onWheel={ev => {
        if (ev.ctrlKey) return

        const camera = store.camera
        zoomTo(camera.translate(-ev.deltaX / camera.k, -ev.deltaY / camera.k))
      }}
      onMouseOver={({ target }) => {
        setStore({ hovering: closestNodeID(target) })
      }}
      onDblClick={e => {
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

      <g ref={zoomedEl!} transform={zoomTransform(store.camera)}>
        <For each={store.tree.data.nodes[ROOT_ID].children}>
          {id => <OneNode id={id} />}
        </For>
        <For
          each={toKeysArray(store.tree.data.edges).filter(
            eid => !store.dragging || !(eid in store.dragging),
          )}
        >
          {e => <OneEdge id={e} />}
        </For>

        <Show when={store.brush}>{b => <BrushRect bbox={b()} />}</Show>
        <Show when={store.newArrow}>
          {a => <NewArrowC from={a().from} to={a().to} />}
        </Show>
      </g>
    </svg>
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
