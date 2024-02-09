import { useParams } from "@solidjs/router"
import { createEffect, type Component } from "solid-js"
import { type GraphID } from "./diagram/data/data.ts"
import { setLastGraph } from "./diagram/data/persistence.ts"
import { useTypedNavigate } from "./routes.tsx"

export const RedirectGraphPage: Component = () => {
  const params = useParams<{ id: GraphID }>()
  const navigate = useTypedNavigate()

  createEffect(() => {
    setLastGraph(params.id)
    navigate("/", { replace: true })
  })

  return null
}
