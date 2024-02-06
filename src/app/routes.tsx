import { A, type AnchorProps } from "@solidjs/router"
import { type Component } from "solid-js"
import { type GraphID } from "./diagram/data/data.ts"

export type Route = `/` | `/d/${GraphID}` | `/list`

interface RouteProps extends AnchorProps {
  href: Route
}

export const Anchor: Component<RouteProps> = A
