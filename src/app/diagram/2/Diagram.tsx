import { type Component } from "solid-js"
import { type NodeID } from "../data/data"
import { SvgDefs } from "../SvgDefs"

export const Diagram: Component = () => {
  return (
    <svg class="h-full w-full">
      <SvgDefs />
    </svg>
  )
}

const OneNode: Component<{ id: NodeID }> = props => {
  return <g></g>
}
