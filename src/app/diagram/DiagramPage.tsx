import { DropdownMenu } from "@kobalte/core"
import { zoomIdentity, ZoomTransform } from "d3-zoom"
import {
  createEffect,
  createSignal,
  onCleanup,
  Show,
  type Component,
  type Setter,
} from "solid-js"
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "terracotta"
import icon from "../../assets/icon.svg"
import { CloseIcon } from "../components.tsx"
import { TypedA, useTypedNavigate } from "../routes.tsx"
import { ToastPortal } from "../Toasts.tsx"
import type { DataState } from "./data/data.ts"
import {
  archive,
  getLastGraph,
  saveTitle,
  storeGraph,
} from "./data/persistence.ts"
import { ROOT_ID } from "./data/ROOT_ID.ts"
import { emptyDataState, setStore, store } from "./data/state.ts"
import { DiagramSVG, zoomTo } from "./draw/DiagramSVG.tsx"
import { ShortcutTable } from "./hotkeys/draw.tsx"
import { setupHotkeys } from "./hotkeys/hotkeys.tsx"

function hundredPctZoom({ data, index }: DataState): ZoomTransform {
  const nodes = Object.values(data.nodes).filter(
    ({ id }) => index.parents[id] === ROOT_ID,
  )

  return nodes.length
    ? new ZoomTransform(
        1,
        -Math.min(...nodes.map(({ rect }) => rect.x)),
        -Math.min(...nodes.map(({ rect }) => rect.y)),
      )
    : zoomIdentity
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
        <DropdownMenu.Content class="cursor-pointer rounded-sm border">
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

function setupVisualViewportVars(): VoidFunction {
  const view = document.defaultView
  if (!view) return () => {}

  const win = view
  const root = document.documentElement
  const viewport = win.visualViewport

  function update(): void {
    const top = viewport?.offsetTop ?? 0
    const bottom = viewport
      ? Math.max(0, win.innerHeight - viewport.height - top)
      : 0

    root.style.setProperty("--arrowbox-viewport-top", `${top}px`)
    root.style.setProperty("--arrowbox-viewport-bottom", `${bottom}px`)
  }

  update()
  win.addEventListener("resize", update)
  viewport?.addEventListener("resize", update)
  viewport?.addEventListener("scroll", update)

  return () => {
    root.style.removeProperty("--arrowbox-viewport-top")
    root.style.removeProperty("--arrowbox-viewport-bottom")
    win.removeEventListener("resize", update)
    viewport?.removeEventListener("resize", update)
    viewport?.removeEventListener("scroll", update)
  }
}

const HelpButton: Component = () => {
  const [isOpen, setIsOpen] = createSignal(false)

  const closeModal = () => setIsOpen(false)
  const openModal = () => setIsOpen(true)

  return (
    <>
      <button
        class="bg-gray-100 px-3 py-2 transition-colors hover:bg-gray-300"
        onClick={openModal}
      >
        ?
      </button>

      <Transition appear show={isOpen()}>
        <Dialog
          isOpen
          class="fixed inset-0 z-10 overflow-y-auto"
          onClose={closeModal}
        >
          <div class="flex min-h-screen items-center justify-center px-4">
            <TransitionChild
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <DialogOverlay class="fixed inset-0 z-0 bg-gray-900/50" />
            </TransitionChild>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span class="inline-block h-screen align-middle" aria-hidden="true">
              &#8203;
            </span>
            <TransitionChild
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel class="relative z-10 my-8 flex w-full max-w-md transform flex-col gap-3 overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div class="flex justify-between">
                  <DialogTitle
                    as="h3"
                    class="text-lg leading-6 font-medium text-gray-900"
                  >
                    Keyboard shortcuts
                  </DialogTitle>

                  <button aria-label="Close" onClick={closeModal}>
                    <CloseIcon />
                  </button>
                </div>

                <DialogDescription>
                  <ShortcutTable />
                </DialogDescription>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export const DiagramPage: Component = () => {
  createEffect(() => {
    const { graph, title, id } = getLastGraph()
    setStore({
      tree: emptyDataState(graph),
      title,
      id,
      camera: zoomIdentity,
    })

    onCleanup(addClass(document.documentElement, "overscroll-none"))
    onCleanup(setupVisualViewportVars())
    onCleanup(setupHotkeys())
    onCleanup(addClass(document.body, "overscroll-none"))
  })

  createEffect(() => {
    if (!store.dragging) {
      storeGraph(store.id, store.tree.data)
    }
  })

  return (
    <div class="min-h-screen w-full overflow-hidden overscroll-none">
      <DiagramSVG />

      <TypedA
        title="Open menu"
        href="/list"
        data-testid="diagram-menu-link"
        class="fixed left-2 z-20 h-12 w-12 rounded-full bg-white p-2 shadow-xl duration-200 hover:bg-gray-100"
        style={{
          top: "calc(var(--arrowbox-viewport-top, 0px) + 0.5rem)",
        }}
      >
        <img alt="Arrowbox" src={icon} />
      </TypedA>

      <div
        class="fixed left-1/2 z-20"
        data-testid="diagram-title"
        style={{
          top: "calc(var(--arrowbox-viewport-top, 0px) + 0.5rem)",
        }}
      >
        <Title />
      </div>

      <div
        class="fixed left-2 z-20 flex flex-row overflow-hidden rounded-md"
        data-testid="diagram-bottom-controls"
        style={{
          bottom: "calc(var(--arrowbox-viewport-bottom, 0px) + 0.5rem)",
        }}
      >
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
