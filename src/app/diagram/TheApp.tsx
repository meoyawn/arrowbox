import { ZoomTransform } from "d3-zoom"
import { createEffect, onCleanup, type Component } from "solid-js"
import icon from "../../assets/icon.svg"
import { Anchor } from "../routes.tsx"
import { Diagram2, zoomTo } from "./Diagram2.tsx"
import { rootID } from "./data/data.ts"
import { store } from "./data/state.ts"
import { setupHotkeys } from "./hotkeys"

export const TheApp: Component = () => {
  createEffect(() => {
    onCleanup(setupHotkeys())
  })

  return (
    <div class=" min-h-screen w-full overflow-hidden">
      <Diagram2 />

      <Anchor
        title="Open menu"
        href="/"
        class="absolute left-2 top-2 h-12 w-12 rounded-full bg-white p-2 shadow-xl duration-200 hover:bg-gray-100"
      >
        <img alt="Arrowbox" src={icon} />
      </Anchor>

      <button
        class="absolute bottom-2 left-2 rounded-md border bg-gray-100 px-3 py-2 transition-colors hover:bg-gray-300"
        onClick={() => {
          const { data, index } = store.tree
          const nodes = Object.values(data.nodes).filter(
            ({ id }) => index.parents[id] === rootID,
          )
          zoomTo(
            new ZoomTransform(
              1,
              -Math.min(...nodes.map(({ rect }) => rect.x)),
              -Math.min(...nodes.map(({ rect }) => rect.y)),
            ),
          )
        }}
      >
        {Math.round(store.camera.k * 100)}%
      </button>
    </div>
  )
}
