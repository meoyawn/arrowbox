import { ZoomTransform } from "d3-zoom"
import { createEffect, onCleanup, type Component } from "solid-js"
import icon from "../../assets/icon.svg"
import { TypedA } from "../routes.tsx"
import { emptyDataState, rootID, type DataState } from "./data/data.ts"
import { getLastGraph, storeGraph } from "./data/persistence.ts"
import { setStore, store } from "./data/state.ts"
import { DiagramSVG, zoomTo } from "./draw/DiagramSVG.tsx"
import { setupHotkeys } from "./hotkeys.ts"

function hundredPercent({ data, index }: DataState): ZoomTransform {
  const nodes = Object.values(data.nodes).filter(
    ({ id }) => index.parents[id] === rootID,
  )
  return new ZoomTransform(
    1,
    -Math.min(...nodes.map(({ rect }) => rect.x)),
    -Math.min(...nodes.map(({ rect }) => rect.y)),
  )
}

export const DiagramPage: Component = () => {
  createEffect(() => {
    setStore({ tree: emptyDataState(getLastGraph()) })

    onCleanup(setupHotkeys())

    document.body.classList.add("overscroll-none")
    onCleanup(() => document.body.classList.remove("overscroll-none"))
  })

  createEffect(() => {
    if (!store.dragging) {
      storeGraph(store.tree.data)
    }
  })

  return (
    <div class="min-h-screen w-full overflow-hidden">
      <DiagramSVG />

      <TypedA
        title="Open menu"
        href="/list"
        class="absolute left-2 top-2 h-12 w-12 rounded-full bg-white p-2 shadow-xl duration-200 hover:bg-gray-100"
      >
        <img alt="Arrowbox" src={icon} />
      </TypedA>

      <button
        class="absolute bottom-2 left-2 rounded-md border bg-gray-100 px-3 py-2 transition-colors hover:bg-gray-300"
        onClick={() => zoomTo(hundredPercent(store.tree))}
      >
        {Math.round(store.camera.k * 100)}%
      </button>
    </div>
  )
}
