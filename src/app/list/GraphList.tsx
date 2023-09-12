import { A, useNavigate } from "@solidjs/router"
import { createEffect, createSignal, For, type Component } from "solid-js"
import { genID } from "../diagram/data/data"

export type GraphID = `g${string}`

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
      class="rounded bg-blue-500 px-4 py-2 font-bold text-white duration-200 hover:bg-blue-700"
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
    <div>
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
