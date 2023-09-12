import { A, useParams } from "@solidjs/router"
import clsx from "clsx"
import { pointer, select } from "d3-selection"
import { type ZoomTransform } from "d3-zoom"
import { createEffect, createMemo, For, Show, type Component } from "solid-js"
import icon from "../../assets/icon.svg"
import { isEl } from "../../lib/dom"
import { cornerPoints, midPoints } from "../../lib/geometry"
import staticConfig from "../../static.config.json"
import { md2html } from "../markdown"
import {
  edgeAnchor,
  isNodeID,
  patch,
  type EdgeID,
  type NodeID,
  type TheDiagram,
} from "./data/data"
import { addNode } from "./data/edit"
import { buildIndex } from "./data/graphIndex"
import { emptyHistory } from "./data/history"
import { emptyDiagram, setStore, store, type NewArrowState } from "./data/state"
import { DefaultGrid } from "./DefaultGrid"
import { d3Drag } from "./drag"
import { SvgDefs } from "./SvgDefs"
import { wheeled } from "./zoom"


const cssTransform = ({ k, x, y }: ZoomTransform): string =>
  `translate(${x}px, ${y}px) scale(${k})`

const svgTransform = ({ x, y }: { x: number; y: number }): string =>
  `translate(${x} ${y})`

const OneEdge: Component<{ id: EdgeID }> = props => {
  const e = createMemo(() => store.data.data.edges[props.id])
  const from = createMemo(() => edgeAnchor(store.data.data.nodes, e().from))
  const to = createMemo(() => edgeAnchor(store.data.data.nodes, e().to))

  return (
    <line
      stroke-width={2}
      stroke="black"
      x1={from()[0]}
      y1={from()[1]}
      x2={to()[0]}
      y2={to()[1]}
      marker-end={"url(#triangle)"}
    />
  )
}

const OneNode: Component<{ id: NodeID }> = props => {
  const node = () => store.data.data.nodes[props.id]
  const selected = () => Boolean(store.selected[props.id])
  const mPoints = createMemo(() => midPoints(node().rect))
  const cPoints = createMemo(() => cornerPoints(node().rect))
  const editing = () => store.editing === props.id

  let tarea: HTMLTextAreaElement | undefined
  createEffect(() => {
    if (editing() && tarea) {
      tarea.focus()
      tarea.select()
    }
  })

  return (
    <g
      data-nodeID={props.id}
      class={clsx("group", {
        "pointer-events-auto": store.dragging !== props.id,
        "opacity-50": store.dragging === props.id,
      })}
      transform={svgTransform(node().rect)}
    >
      <rect
        data-drag="node"
        class="fill-blue-950 group-hover:fill-blue-500"
        width={node().rect.width}
        height={node().rect.height}
      />

      <For each={mPoints()}>
        {([cx, cy]) => (
          <circle
            data-drag="mid"
            class="hidden fill-white stroke-black hover:cursor-grab group-hover:block"
            r={5}
            cx={cx}
            cy={cy}
          />
        )}
      </For>

      <Show when={selected()}>
        <For each={cPoints()}>
          {([cx, cy]) => (
            <rect
              data-drag="corner"
              class="fill-white stroke-black"
              x={cx - 3}
              y={cy - 3}
              width={6}
              height={6}
            />
          )}
        </For>
      </Show>

      <foreignObject
        class="prose max-w-none overflow-visible whitespace-nowrap"
        x={0}
        y={0}
        width={1}
        height={1}
        // eslint-disable-next-line solid/no-innerhtml
        innerHTML={md2html(node().text)}
      />

      <Show when={editing()}>
        <foreignObject
          class="overflow-visible"
          x={0}
          y={0}
          height={1}
          width={1}
        >
          <textarea
            ref={tarea}
            class="form-textarea p-2"
            value={node().text}
            placeholder="Markdown"
            onKeyPress={ev => {
              switch (ev.key) {
                case "Enter": {
                  if (ev.shiftKey) return

                  setStore({
                    // eslint-disable-next-line solid/reactivity
                    data: patch(store.data, ({ nodes }) => {
                      nodes[props.id].text = ev.currentTarget.value
                    }),
                    editing: undefined,
                  })
                  break
                }
              }
              return false
            }}
            onKeyDown={ev => {
              switch (ev.key) {
                case "Escape": {
                  setStore({ editing: undefined })
                  break
                }
              }
              return false
            }}
          />
        </foreignObject>
      </Show>
    </g>
  )
}

const nodeIDs = (
  nodes: Record<NodeID, unknown>,
  dragging: NodeID | EdgeID | undefined,
): ReadonlyArray<NodeID> => {
  const keys = Object.keys(nodes) as ReadonlyArray<NodeID>
  if (!isNodeID(dragging)) return keys

  const out = keys.filter(k => k !== dragging)
  if (dragging) {
    out.push(dragging)
  }
  return out
}

const edgeIDs = (edges: Record<EdgeID, unknown>): ReadonlyArray<EdgeID> =>
  Object.keys(edges) as ReadonlyArray<EdgeID>

const NewArrow: Component<{ a: NewArrowState }> = props => (
  <line
    class="stroke-black"
    stroke-width={2}
    x1={props.a.fromWorld[0]}
    y1={props.a.fromWorld[1]}
    x2={props.a.toWorld[0]}
    y2={props.a.toWorld[1]}
  />
)

export const TheApp: Component = () => {
  const params = useParams()

  createEffect(() => {
    const stored = localStorage.getItem(params.id)
    const data = stored ? (JSON.parse(stored) as TheDiagram) : emptyDiagram()
    setStore({
      data: { data, history: emptyHistory(), index: buildIndex(data) },
    })
  })

  createEffect(() => {
    localStorage.setItem(params.id, JSON.stringify(store.data.data))
  })

  return (
    <div class="fixed inset-0 h-full w-full overflow-hidden">
      {/*eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/mouse-events-have-key-events, jsx-a11y/no-static-element-interactions*/}
      <div
        ref={el => select(el).call(d3Drag)}
        class="h-full w-full"
        onDblClick={ev => {
          ev.preventDefault()

          const node = ev.target.closest("[data-nodeID]")
          if (node) {
            const nid = (node as unknown as HTMLOrSVGElement).dataset
              .nodeID as NodeID
            setStore({ editing: nid })
          } else {
            addNode(pointer(ev))
          }
        }}
        onWheel={ev => {
          ev.preventDefault()

          const old = store.camera
          const cam = ev.ctrlKey
            ? wheeled(old, ev)
            : old.translate(-ev.deltaX / old.k, -ev.deltaY / old.k)

          setStore("camera", cam)
        }}
        onClick={ev => {
          ev.preventDefault()

          const node = ev.target.closest("[data-nodeID]")
          if (node) {
            const nid = (node as unknown as HTMLOrSVGElement).dataset
              .nodeID as NodeID
            setStore({ selected: { [nid]: true } })
          } else {
            setStore({ selected: {} })
          }
        }}
        onMouseOver={ev => {
          ev.preventDefault()

          const node = ev.target.closest("[data-nodeID]")
          const hovering = isEl(node)
            ? (node.dataset.nodeID as NodeID)
            : undefined
          setStore({ hovering })
        }}
      >
        <Show when={staticConfig.gridEnabled}>
          <DefaultGrid camera={store.camera} />
        </Show>

        <svg
          class="pointer-events-none absolute left-0 top-0 overflow-visible"
          style={{ transform: cssTransform(store.camera) }}
        >
          <SvgDefs />

          <Show when={store.newArrow}>{a => <NewArrow a={a()} />}</Show>
          <For each={edgeIDs(store.data.data.edges)}>
            {eid => <OneEdge id={eid} />}
          </For>
          <For each={nodeIDs(store.data.data.nodes, store.dragging)}>
            {nid => <OneNode id={nid} />}
          </For>
        </svg>
      </div>

      <A
        title="Open menu"
        href="/"
        class="absolute left-2 top-2 h-12 w-12 rounded-full bg-white p-2 shadow-xl duration-200 hover:bg-gray-100"
      >
        <img alt="Arrowbox" src={icon} />
      </A>
    </div>
  )
}
