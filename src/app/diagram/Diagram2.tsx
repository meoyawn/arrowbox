import { destructure } from "@solid-primitives/destructure"
import { pointer, select, type Selection } from "d3-selection"
import { zoom, type D3ZoomEvent, type ZoomTransform } from "d3-zoom"
import type { BBox } from "rbush"
import { createEffect, For, Show, type Component } from "solid-js"
import { dataset, svgTransform2 } from "../../lib/dom.ts"
import { midPoint } from "../../lib/geometry.ts"
import { memoize } from "../../lib/ts.ts"
import {
  edgeAnchor,
  isNodeID,
  rootID,
  type EdgeID,
  type NodeID,
} from "./data/data.ts"
import { patching } from "./data/history.ts"
import { behaviorDrag, worldDragSubj } from "./drag.ts"
import { OneEdge } from "./draw/OneEdge.tsx"
import { OneNode } from "./draw/OneNode.tsx"
import { setStore, store, type NewArrow } from "./store.ts"
import { SvgDefs } from "./SvgDefs.tsx"
import { addNode2 } from "./transactions.ts"

const draggingLast = (
  children: ReadonlyArray<NodeID>,
  dragging: NodeID | EdgeID | undefined,
): ReadonlyArray<NodeID> => {
  if (!children.length || !isNodeID(dragging)) return children

  const out = children.filter(k => k !== dragging)
  out.push(dragging)
  return out
}

const d3Zoom = zoom<Element, unknown>()
  .scaleExtent([0.05, 8])
  .filter((ev: UIEvent) => (ev instanceof WheelEvent ? ev.ctrlKey : true))
  .on("zoom", (e: D3ZoomEvent<Element, unknown>) =>
    setStore({ camera: e.transform }),
  )

export const zoomTo = (
  s: Selection<Element, unknown, null, unknown>,
  t: ZoomTransform,
): void => d3Zoom.transform(s, t)

export const Diagram2: Component = () => {
  let svgEl: SVGSVGElement
  let zoomedEl: SVGGElement

  const svgSel = memoize(() => select(svgEl as Element))

  createEffect(() => {
    svgSel()
      .call(behaviorDrag(worldDragSubj, zoomedEl))
      .call(d3Zoom)
      .on("dblclick.zoom", null)
      .on("mousedown.zoom", null)
  })

  return (
    <svg
      ref={svgEl!}
      class="h-full min-h-screen w-full"
      onDblClick={e => {
        const world = pointer(e, zoomedEl)
        setStore(s => ({
          tree: patching(s.tree, x => {
            addNode2(x, world)
          }),
        }))
      }}
      onWheel={ev => {
        if (ev.ctrlKey) return

        const camera = store.camera
        zoomTo(
          svgSel(),
          camera.translate(-ev.deltaX / camera.k, -ev.deltaY / camera.k),
        )
      }}
      onMouseOver={ev => {
        const hovering = dataset(ev.target.closest("[data-nodeID]"))?.nodeID as
          | NodeID
          | undefined
        setStore({ hovering })
      }}
      onClick={ev => {
        const target = ev.target
        const nid = dataset(target.closest("[data-nodeID]"))?.nodeID
        const eid = dataset(target.closest("[data-edgeID]"))?.edgeID
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

      <g ref={zoomedEl!} transform={svgTransform2(store.camera)}>
        <For each={store.tree.data.nodes[rootID].children}>
          {id => <OneNode id={id} />}
        </For>
        <For each={Object.keys(store.tree.data.edges)}>
          {e => <OneEdge id={e as EdgeID} />}
        </For>

        <Show when={store.brush}>{b => <BrushRect bbox={b()} />}</Show>
        <Show when={store.newArrow}>
          {a => <NewArrowC from={a().from} toX={a().toX} toY={a().toY} />}
        </Show>
      </g>
    </svg>
  )
}

const NewArrowC: Component<NewArrow> = props => {
  const mid = () => midPoint(store.tree.data.nodes[props.from].rect)
  return (
    <line
      x1={mid()[0]}
      y1={mid()[1]}
      x2={props.toX}
      y2={props.toY}
      stroke={"black"}
      stroke-width={2}
      marker-end={"url(#triangle)"}
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
