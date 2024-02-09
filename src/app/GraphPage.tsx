import { useNavigate, useParams } from "@solidjs/router"
import { createEffect, type Component } from "solid-js"
import { type GraphID } from "./diagram/data/data.ts"
import { setLastGraph } from "./diagram/data/persistence.ts"

export const GraphPage: Component = () => {
  const params = useParams<{ id: GraphID }>()
  const navigate = useNavigate()

  createEffect(() => {
    setLastGraph(params.id)
    navigate("/")
  })

  return null
}
