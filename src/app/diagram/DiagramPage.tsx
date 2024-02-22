import { Dialog, DropdownMenu } from "@kobalte/core"
import { ZoomTransform, zoomIdentity } from "d3-zoom"
import {
  Show,
  createEffect,
  createSignal,
  onCleanup,
  type Component,
  type Setter,
} from "solid-js"
import icon from "../../assets/icon.svg"
import { ToastPortal } from "../Toasts.tsx"
import { CloseIcon } from "../components.tsx"
import { TypedA, useTypedNavigate } from "../routes.tsx"
import { ROOT_ID } from "./data/ROOT_ID.ts"
import type { DataState } from "./data/data.ts"
import {
  archive,
  getLastGraph,
  saveTitle,
  storeGraph,
} from "./data/persistence.ts"
import { emptyDataState, setStore, store } from "./data/state.ts"
import { DiagramSVG, zoomTo } from "./draw/DiagramSVG.tsx"
import { setupHotkeys } from "./hotkeys.tsx"

function hundredPctZoom({ data, index }: DataState): ZoomTransform {
  const nodes = Object.values(data.nodes).filter(
    ({ id }) => index.parents[id] === ROOT_ID,
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

function addClass(el: HTMLElement, cls: string): VoidFunction {
  el.classList.add(cls)

  return () => el.classList.remove(cls)
}

const HelpButton: Component = () => (
  <Dialog.Root>
    <Dialog.Trigger class="bg-gray-100 px-3 py-2 transition-colors hover:bg-gray-300">
      ?
    </Dialog.Trigger>

    <Dialog.Portal>
      <Dialog.Overlay class="fixed inset-0 z-50 bg-black bg-opacity-20" />

      <div class="fixed inset-0 z-50 flex items-center justify-center">
        <Dialog.Content class="z-50 mx-4 w-full max-w-xs transform rounded-md border border-gray-200 bg-white p-4 shadow-lg transition-all duration-300">
          <div class="mb-3 flex items-baseline justify-between">
            <Dialog.Title class="text-lg font-semibold text-gray-900">
              About Kobalte
            </Dialog.Title>
            <Dialog.CloseButton class="text-gray-600">
              <CloseIcon class="h-4 w-4" />
            </Dialog.CloseButton>
          </div>
          <Dialog.Description class="text-sm text-gray-700">
            Kobalte is a UI toolkit for building accessible web apps and design
            systems with SolidJS. It provides a set of low-level UI components
            and primitives which can be the foundation for your design system
            implementation.
          </Dialog.Description>
        </Dialog.Content>
      </div>
    </Dialog.Portal>
  </Dialog.Root>
)

export const DiagramPage: Component = () => {
  createEffect(() => {
    const { graph, title, id } = getLastGraph()
    setStore({
      tree: emptyDataState(graph),
      title,
      id,
      camera: zoomIdentity,
    })

    onCleanup(setupHotkeys())
    onCleanup(addClass(document.body, "overscroll-none"))
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
          onClick={() => zoomTo(hundredPctZoom(store.tree))}
        >
          {Math.round(store.camera.k * 100)}%
        </button>

        <HelpButton />
      </div>

      <ToastPortal />
    </div>
  )
}
