import { A, Route, type AnchorProps, type RouteProps } from "@solidjs/router"
import { type Component, type JSX } from "solid-js"
import type { GraphID } from "./diagram/data/data.ts"

type Route = `/` | `/list` | `/graph/:id` | `/graph/${GraphID}`

export const TypedA: Component<AnchorProps & { href: Route }> = A

export const TypedRoute: <T = unknown>(
  props: RouteProps<Route, T>,
) => JSX.Element = Route
