import { A, useNavigate } from "@solidjs/router"
import { For, createEffect, createSignal, type Component } from "solid-js"
import logoLight from "../../assets/logo_light.svg"
import { genID, type GraphID } from "../diagram/data/data"

type GraphList = Record<GraphID, { title: string }>

const storageK = "graph-list"

const [list, setList] = createSignal(
  (() => {
    const stored = localStorage.getItem(storageK)
    return stored ? (JSON.parse(stored) as GraphList) : ({} satisfies GraphList)
  })(),
)

const NewGraph: Component = () => {
  const nav = useNavigate()

  return (
    <button
      class="rounded bg-blue-600 px-4 py-2 font-bold text-white duration-200 hover:bg-blue-800"
      onClick={() => {
        const id = genID("g")
        nav(`/graph/${id}`)
        setList(old => ({ ...old, [id]: { title: "Untitled" } }))
      }}
    >
      New graph
    </button>
  )
}

export const GraphList: Component = () => {
  createEffect(() => {
    localStorage.setItem(storageK, JSON.stringify(list()))
  })

  return (
    <div class="mx-auto flex max-w-xl flex-col gap-4 py-4">
      <img alt="Arrowbox" class="mx-auto h-8" src={logoLight} />

      <h1 class="mx-auto text-5xl font-medium">Welcome back</h1>

      <NewGraph />

      <ul>
        <For each={Object.keys(list()) as ReadonlyArray<GraphID>}>
          {id => (
            <li>
              <A href={`/graph/${id}`}>{list()[id].title}</A>
            </li>
          )}
        </For>
      </ul>
    </div>
  )
}
