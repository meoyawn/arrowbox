import { A, useNavigate } from "@solidjs/router"
import { For, createEffect, createSignal, type Component } from "solid-js"
import logoLight from "../assets/logo_light.svg"
import { type GraphID } from "./diagram/data/data.ts"
import {
  createNewGraph,
  getStoredGraphs,
  type StoredGraphs,
} from "./diagram/data/persistence.ts"

const NewGraph: Component = () => {
  const nav = useNavigate()

  return (
    <button
      class="rounded bg-blue-600 px-4 py-2 font-bold text-white duration-200 hover:bg-blue-800"
      onClick={() => nav(`/graph/${createNewGraph()}`)}
    >
      New diagram
    </button>
  )
}

function sorted(g: StoredGraphs): readonly GraphID[] {
  const es = Object.entries(g)
  es.sort(([, a], [, b]) => b.lastModifiedMs - a.lastModifiedMs)
  return es.map(([id]) => id as GraphID)
}

export const ListPage: Component = () => {
  const [list, setList] = createSignal<StoredGraphs>({})

  createEffect(() => {
    setList(getStoredGraphs())
  })

  return (
    <div class="container">
      <div class="py-4">
        <A
          href="/"
          class="absolute left-2 top-2 h-12 w-12 rounded-full bg-white py-3 text-center shadow-xl duration-200 hover:bg-gray-100"
        >
          ⛌
        </A>

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

        <ul>
          <For each={sorted(list())}>
            {id => (
              <li>
                <A href={`/graph/${id}`}>{list()[id].title}</A>
              </li>
            )}
          </For>
        </ul>
      </div>
    </div>
  )
}
