import { Toast, toaster } from "@kobalte/core"
import type { ToastComponent } from "@kobalte/core/dist/types/toast/types"
import { For, createEffect, onCleanup, type Component } from "solid-js"
import { Portal } from "solid-js/web"
import logoLight from "../assets/logo_light.svg"
import { type Graph, type GraphID } from "./diagram/data/data.ts"
import { layoutGraph } from "./diagram/data/elk.ts"
import { fromMermaid } from "./diagram/data/mermaid/parse.ts"
import {
  createNewGraph,
  getStoredGraphs,
  type StoredGraphs,
} from "./diagram/data/persistence.ts"
import { setRect } from "./diagram/data/transactions.ts"
import { TypedA, useTypedNavigate } from "./routes.tsx"

const CantParseMermaidToast: ToastComponent = props => (
  <Toast.Root toastId={props.toastId}>
    <Toast.CloseButton />
    <Toast.Title />
    <Toast.Description />
    <Toast.ProgressTrack>
      <Toast.ProgressFill />
    </Toast.ProgressTrack>
  </Toast.Root>
)

const NewGraph: Component = () => {
  const nav = useTypedNavigate()

  createEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const str = e.clipboardData?.getData("text/plain")
      if (!str) return

      void laidOutMermaid(str).then(g => {
        if (g) {
          nav(`/graph/${createNewGraph(g).id}`)
        } else {
          toaster.show(CantParseMermaidToast)
        }
      })
    }

    document.addEventListener("paste", onPaste)
    onCleanup(() => document.removeEventListener("paste", onPaste))
  })

  return (
    <button
      class="rounded bg-blue-600 px-4 py-2 font-bold text-white duration-200 hover:bg-blue-800"
      onClick={() => nav(`/graph/${createNewGraph().id}`)}
    >
      New diagram
    </button>
  )
}

function sorted(g: StoredGraphs): readonly GraphID[] {
  const es = Object.entries(g)
  es.sort(([, a], [, b]) => b.lastModifiedMs - a.lastModifiedMs)
  return es.filter(([, x]) => !x.archived).map(([id]) => id as GraphID)
}

async function laidOutMermaid(str: string): Promise<Graph | undefined> {
  const g = await fromMermaid(str)
  if (!g) return

  const elk = await layoutGraph(g)
  setRect(g.nodes, elk)

  return g
}

export const ListPage: Component = () => {
  const list = getStoredGraphs()

  return (
    <div class="container">
      <div class="py-4">
        <TypedA
          title="Back to diagram"
          href="/"
          class="absolute left-2 top-2 h-12 w-12 rounded-full bg-white py-3 text-center shadow-xl duration-200 hover:bg-gray-100"
        >
          ⛌
        </TypedA>

        <img alt="Arrowbox" class="mx-auto h-8" src={logoLight} />

        <a
          class="absolute right-5 top-5"
          href="https://github.com/arrowboxco/community/discussions"
          target="_blank"
          rel="noreferrer"
        >
          Support
        </a>
      </div>

      <div class="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 class="mx-auto text-5xl font-medium">Welcome back</h1>

        <NewGraph />

        <ul class="flex w-full flex-col gap-2">
          <For each={sorted(list)}>
            {id => (
              <li class="w-full">
                <TypedA
                  class="block w-full rounded-2xl border bg-amber-100 px-6 py-2 shadow-md hover:bg-amber-200"
                  href={`/graph/${id}`}
                >
                  {list[id].title}
                </TypedA>
              </li>
            )}
          </For>
        </ul>
      </div>

      <Portal>
        <Toast.Region>
          <Toast.List class="toast__list" />
        </Toast.Region>
      </Portal>
    </div>
  )
}
