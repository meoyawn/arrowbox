import {
  A,
  Route,
  useNavigate,
  type AnchorProps,
  type NavigateOptions,
  type RouteProps,
} from "@solidjs/router"
import type { Component, JSX } from "solid-js"
import type { GraphID } from "./diagram/data/data.ts"

type Route = "/" | "/list" | `/graph/${GraphID}` | "/new"

export const TypedA: Component<AnchorProps & { href: Route }> = A

export const TypedRoute: <T = unknown>(
  props: RouteProps<Route, T>,
) => JSX.Element = Route

interface TypedNavigator {
  (to: Route, options?: Partial<NavigateOptions>): void

  (delta: number): void
}

export const useTypedNavigate: () => TypedNavigator = useNavigate
