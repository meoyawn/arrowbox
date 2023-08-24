import { pointer } from "d3-selection"
import { type ZoomTransform } from "d3-zoom"
import { createMemo, For, Show, type Component } from "solid-js"
import staticConfig from "../static.config.json"
import { addNode, type Node } from "./data"
import { DefaultGrid } from "./DefaultGrid"
import { setStore, store } from "./state"
import { wheeled } from "./zoom"


const cssTransform = ({ k, x, y }: ZoomTransform): string =>
  `
  translate(${x}px, ${y}px)
  scale(${k})
  `

const svgTransform = ({ x, y }: { x: number; y: number }): string =>
  `translate(${x} ${y})`

const OneNode: Component<{ node: Node }> = props => (
  <g
    class="group pointer-events-auto"
    transform={svgTransform(props.node.rect)}
  >
    <rect
      class="fill-blue-950 hover:fill-blue-500"
      width={props.node.rect.width}
      height={props.node.rect.height}
    />
  </g>
)

export const TheApp: Component = () => {
  const nodes = createMemo(() => Object.values(store.data.nodes))

  return (
    <div
      class="fixed inset-0 h-full w-full overflow-hidden"
      onDblClick={ev => {
        ev.preventDefault()

        setStore("data", addNode(store, pointer(ev)))
      }}
      onWheel={ev => {
        ev.preventDefault()

        const old = store.camera
        const cam = ev.ctrlKey
          ? wheeled(old, ev)
          : old.translate(-ev.deltaX / old.k, -ev.deltaY / old.k)

        setStore("camera", cam)
      }}
    >
      <Show when={staticConfig.gridEnabled}>
        <DefaultGrid camera={store.camera} />
      </Show>

      <svg
        class="pointer-events-none absolute left-0 top-0 overflow-visible"
        style={{ transform: cssTransform(store.camera) }}
      >
        <For each={nodes()}>{node => <OneNode node={node} />}</For>
      </svg>
    </div>
  )
}
