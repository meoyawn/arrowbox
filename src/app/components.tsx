import type { Component, JSX } from "solid-js"

export const ExternalA: Component<
  JSX.AnchorHTMLAttributes<HTMLAnchorElement>
> = props => (
  // eslint-disable-next-line jsx-a11y/anchor-has-content
  <a {...props} target="_blank" rel="nofollow" />
)

export const CloseIcon: Component = () => "✕"
