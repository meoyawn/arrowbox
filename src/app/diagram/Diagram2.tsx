import { pointer, select, type Selection } from "d3-selection"
import { zoom, type D3ZoomEvent, type ZoomTransform } from "d3-zoom"
import type { BBox } from "rbush"
import { createEffect, For, Show, type Component } from "solid-js"
import { dataset, svgTransform2 } from "../../lib/dom.ts"
import { midPoint } from "../../lib/geometry.ts"
import { memoize } from "../../lib/ts.ts"
import { isNodeID, rootID, type EdgeID, type NodeID } from "./data/data.ts"
import { patching } from "./data/history.ts"
import { setStore, store, type NewArrow } from "./data/store.ts"
import { addNode } from "./data/transactions.ts"
import { behaviorDrag, worldDragSubj } from "./drag.ts"
import { OneEdge } from "./draw/OneEdge.tsx"
import { OneNode } from "./draw/OneNode.tsx"
import { SvgDefs } from "./SvgDefs.tsx"

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

const closestEdgeID = (el: Element): EdgeID | undefined =>
  dataset(el.closest("[data-edgeID]"))?.edgeID as EdgeID

export const closestNodeID = (el: Element): NodeID | undefined =>
  dataset(el.closest("[data-nodeID]"))?.nodeID as NodeID

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
      onWheel={ev => {
        if (ev.ctrlKey) return

        const camera = store.camera
        zoomTo(
          svgSel(),
          camera.translate(-ev.deltaX / camera.k, -ev.deltaY / camera.k),
        )
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
          setStore(s => ({
            tree: patching(s.tree, x => {
              addNode(x, world)
            }),
          }))
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
