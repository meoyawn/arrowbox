import { destructure } from "@solid-primitives/destructure"
import { A, useParams } from "@solidjs/router"
import { pointer, select } from "d3-selection"
import { type ZoomTransform } from "d3-zoom"
import { createEffect, For, onCleanup, Show, type Component } from "solid-js"
import icon from "../../assets/icon.svg"
import { isEl } from "../../lib/dom"
import staticConfig from "../../static.config.json"
import { md2html } from "../markdown"
import {
  edgeAnchor,
  emptyDiagram,
  isNodeID,
  patching,
  type EdgeID,
  type NodeID,
  type NodesEdges,
} from "./data/data"
import { emptyHistory } from "./data/history"
import { buildIndex } from "./data/indexing"
import { DefaultGrid } from "./DefaultGrid"
import { setupHotkeys } from "./hotkeys"
import { measureHtml } from "./label"
import { SvgDefs } from "./SvgDefs"
import { wheeled } from "./zoom"

const cssTransform = ({ k, x, y }: ZoomTransform): string =>
  `translate(${x}px, ${y}px) scale(${k})`

const svgTransform = ({ x, y }: { x: number; y: number }): string =>
  `translate(${x} ${y})`

const OneEdge: Component<{ id: EdgeID }> = props => {
  const e = () => store.data.data.edges[props.id]
  const from = () => edgeAnchor(store.data.data.nodes, e().from)
  const to = () => edgeAnchor(store.data.data.nodes, e().to)
  const [fromX, fromY] = destructure(from)
  const [toX, toY] = destructure(to)

  return (
    <line
      stroke-width={2}
      stroke="black"
      x1={fromX()}
      y1={fromY()}
      x2={toX()}
      y2={toY()}
      marker-end={"url(#triangle)"}
    />
  )
}

const TextEditor: Component<{ id: NodeID }> = props => {
  const node = () => store.data.data.nodes[props.id]
  const editing = () => store.editing === props.id

  let tarea: HTMLTextAreaElement | undefined

  createEffect(() => {
    if (editing() && tarea) {
      tarea.focus()
      tarea.select()
    }
  })

  return (
    <Show when={editing()}>
      <foreignObject class="overflow-visible" x={0} y={0} height={1} width={1}>
        <textarea
          ref={tarea}
          class="form-textarea p-2"
          value={node().text}
          placeholder="Markdown"
          onKeyPress={ev => {
            switch (ev.key) {
              case "Enter": {
                if (ev.shiftKey) return

                const md = ev.currentTarget.value
                const html = md2html(md)
                const measured = measureHtml(html)

                setStore({
                  // eslint-disable-next-line solid/reactivity
                  data: patching(store.data, ({ nodes }) => {
                    const n = nodes[props.id]
                    n.text = { markdown: md, html }
                    // TODO only if growth is required. Also
                    n.rect.width = measured.width
                    n.rect.height = measured.height
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
  )
}

export const draggingLast = (
  children: ReadonlyArray<NodeID>,
  dragging: NodeID | EdgeID | undefined,
): ReadonlyArray<NodeID> => {
  if (!children.length || !isNodeID(dragging)) return children

  const out = children.filter(k => k !== dragging)
  out.push(dragging)
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
  const routeParams = useParams()

  createEffect(() => {
    const stored = localStorage.getItem(routeParams.id)
    const data = stored ? (JSON.parse(stored) as NodesEdges) : emptyDiagram()
    setStore({
      data: { data, history: emptyHistory(), index: buildIndex(data) },
    })
  })

  createEffect(() => {
    localStorage.setItem(routeParams.id, JSON.stringify(store.data.data))
  })

  createEffect(() => {
    onCleanup(setupHotkeys())
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
