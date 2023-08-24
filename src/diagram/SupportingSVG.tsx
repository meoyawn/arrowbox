import { Component } from "solid-js"

const ArrowEnd: Component<{ id: string; fill: string }> = props => (
  <marker
    id={props.id}
    viewBox="0 0 10 10"
    refX="9"
    refY="5"
    markerUnits="userSpaceOnUse"
    markerWidth="10"
    markerHeight="10"
    orient="auto"
  >
    <polygon points="0 0 10 5 0 10 2 5" fill={props.fill} stroke="none" />
  </marker>
)

const ArrowStart: Component<{ id: string; fill: string }> = props => (
  <marker
    id={props.id}
    viewBox="0 0 10 10"
    refY="5"
    markerUnits="userSpaceOnUse"
    markerWidth="10"
    markerHeight="10"
    orient="auto"
  >
    <polygon points="10 0 -1 5 10 10 8 5" fill={props.fill} stroke="none" />
  </marker>
)
