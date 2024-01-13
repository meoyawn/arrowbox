import { destructure } from "@solid-primitives/destructure"
import { pointer, select, type Selection } from "d3-selection"
import { zoom, type D3ZoomEvent, type ZoomTransform } from "d3-zoom"
import { createEffect, For, onCleanup, type Component } from "solid-js"
import { dataset, isEl, svgTransform2 } from "../../lib/dom.ts"
import { memoize } from "../../lib/ts.ts"
import {
  edgeAnchor,
  isNodeID,
  rootID,
  type EdgeID,
  type NodeID,
} from "./data/data.ts"
import { patching } from "./data/history.ts"
import { DefaultGrid } from "./incorrect/DefaultGrid.tsx"
import { behaviorDrag, worldDragSubj } from "./drag.ts"
import { setupHotkeys } from "./hotkeys.ts"
import { OneNode } from "./OneNode.tsx"
import { setStore, store } from "./store.ts"
import { SvgDefs } from "./SvgDefs.tsx"
import { addNode2 } from "./transactions.ts"

const OneEdge: Component<{ id: EdgeID }> = props => {
  const e = () => store.tree.data.edges[props.id]
  const from = () => edgeAnchor(store.tree.data.nodes, e().from)
  const to = () => edgeAnchor(store.tree.data.nodes, e().to)

  const [fromX, fromY] = destructure(from)
  const [toX, toY] = destructure(to)

  return (
    <g data-edgeID={props.id}>
      <line
        stroke-width={2}
        stroke="black"
        x1={fromX()}
        y1={fromY()}
        x2={toX()}
        y2={toY()}
        marker-end="url(#triangle)"
      />

      <line />
    </g>
  )
}

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

    onCleanup(setupHotkeys())
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
        if (!ev.ctrlKey) {
          const camera = store.camera
          zoomTo(
            svgSel(),
            camera.translate(-ev.deltaX / camera.k, -ev.deltaY / camera.k),
          )
        }
      }}
      onMouseOver={ev => {
        const node = ev.target.closest("[data-nodeID]")
        const hovering = isEl(node)
          ? (node.dataset.nodeID as NodeID)
          : undefined
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
        <For
          each={store.tree.data.nodes[rootID].children}
        >
          {nid => <OneNode id={nid} />}
        </For>
      </g>
    </svg>
  )
}
