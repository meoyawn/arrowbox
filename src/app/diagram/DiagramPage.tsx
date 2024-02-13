import { Dialog, DropdownMenu } from "@kobalte/core"
import { ZoomTransform, zoomIdentity } from "d3-zoom"
import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  type Component,
  type Setter,
} from "solid-js"
import icon from "../../assets/icon.svg"
import { toKeysArray } from "../../lib/ts.ts"
import { TypedA, useTypedNavigate } from "../routes.tsx"
import {
  emptyDataState,
  rootID,
  type DataState,
  type Graph,
} from "./data/data.ts"
import { layoutGraph } from "./data/elk.ts"
import { fromMermaid } from "./data/mermaid/mermaid.ts"
import {
  archive,
  getLastGraph,
  saveTitle,
  storeGraph,
} from "./data/persistence.ts"
import { setStore, store } from "./data/state.ts"
import { setRect } from "./data/transactions.ts"
import { DiagramSVG, zoomTo } from "./draw/DiagramSVG.tsx"
import { hotkeyTable, setupHotkeys } from "./hotkeys.ts"

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

const Dropdown: Component<{ setEditing: Setter<boolean> }> = props => {
  const nav = useTypedNavigate()

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger class="p-2">
        <span>{store.title}</span>

        <DropdownMenu.Icon />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content class="cursor-pointer rounded border">
          <DropdownMenu.Item
            onSelect={() => {
              // noinspection JSDeprecatedSymbols
              event?.preventDefault()
              props.setEditing(true)
            }}
            class="rounded-t p-2 focus:bg-blue-200"
          >
            <DropdownMenu.ItemLabel>Rename</DropdownMenu.ItemLabel>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            class="rounded-b p-2 focus:bg-blue-200"
            onSelect={() => {
              archive(store.id)
              nav("/list", { replace: true })
            }}
          >
            <DropdownMenu.ItemLabel>Delete</DropdownMenu.ItemLabel>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

const Title: Component = () => {
  const [editing, setEditing] = createSignal(false)

  let input: HTMLInputElement | undefined
  createEffect(() => {
    if (editing()) {
      input?.focus()
    }
  })

  return (
    <Show
      when={!editing()}
      fallback={
        <input
          class="p-2"
          ref={input}
          value={store.title}
          onBlur={() => setEditing(false)}
          onKeyPress={({ currentTarget, key }) => {
            if (key === "Enter") {
              const title = currentTarget.value
              saveTitle(store.id, title)
              setStore({ title })
              setEditing(false)
            }
          }}
        />
      }
    >
      <Dropdown setEditing={setEditing} />
    </Show>
  )
}

export const DiagramPage: Component = () => {
  createEffect(() => {
    const { graph, title, id } = getLastGraph()
    setStore({ tree: emptyDataState(graph), title, id, camera: zoomIdentity })

    onCleanup(setupHotkeys())

    document.body.classList.add("overscroll-none")
    onCleanup(() => document.body.classList.remove("overscroll-none"))
  })

  createEffect(() => {
    if (!store.dragging) {
      storeGraph(store.id, store.tree.data)
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

      <div class="absolute left-1/2 top-2">
        <Title />
      </div>

      <div class="absolute bottom-2 left-2 flex flex-row divide-x rounded-md border">
        <button
          class="bg-gray-100 px-3 py-2 transition-colors hover:bg-gray-300"
          onClick={() => zoomTo(hundredPercent(store.tree))}
        >
          {Math.round(store.camera.k * 100)}%
        </button>

        <Dialog.Root>
          <Dialog.Trigger class="bg-gray-100 px-3 py-2 transition-colors hover:bg-gray-300">
            ?
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay class="fixed inset-0 bg-black bg-opacity-50" />

            <Dialog.Content>
              <Dialog.CloseButton />
              <Dialog.Title />

              <Dialog.Description>
                <For each={toKeysArray(hotkeyTable)}>
                  {k => <div>{hotkeyTable[k].label}</div>}
                </For>
              </Dialog.Description>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  )
}
