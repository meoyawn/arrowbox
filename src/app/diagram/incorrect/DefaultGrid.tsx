import { type ZoomTransform } from "d3-zoom"
import { For, type Component } from "solid-js"
import { modulate } from "../../../lib/number.ts"

const GRID_STEPS: ReadonlyArray<{
  min: number
  mid: number
  step: number
}> = [
  { min: -1, mid: 0.15, step: 64 },
  { min: 0.05, mid: 0.375, step: 16 },
  { min: 0.15, mid: 1, step: 4 },
  { min: 0.7, mid: 2.5, step: 1 },
]

const GRID_SIZE = 10

interface Props {
  step: (typeof GRID_STEPS)[number]
  camera: ZoomTransform
}

const Circle: Component<Props> = props => {
  const s = () => props.step.step * GRID_SIZE * props.camera.k
  const xo = () => 0.5 + props.camera.x * props.camera.k
  const yo = () => 0.5 + props.camera.y * props.camera.k
  return (
    <circle
      fill={"#6D6D6D"}
      r={1}
      cx={xo() > 0 ? xo() % s() : s() + (xo() % s())}
      cy={yo() > 0 ? yo() % s() : s() + (yo() % s())}
      opacity={
        props.camera.k < props.step.mid
          ? modulate(props.camera.k, [props.step.min, props.step.mid], [0, 1])
          : 1
      }
    />
  )
}

const Pattern: Component<Props> = props => {
  const s = () => props.step.step * GRID_SIZE * props.camera.k
  return (
    <pattern
      patternUnits="userSpaceOnUse"
      id={`grid-${props.step.step}`}
      width={s()}
      height={s()}
    >
      <Circle step={props.step} camera={props.camera} />
    </pattern>
  )
}

/**
 * https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/components/default-components/DefaultGrid.tsx
 */
export const DefaultGrid: Component<{
  camera: ZoomTransform
}> = props => (
  <g>
    <defs>
      <For each={GRID_STEPS}>
        {step => <Pattern step={step} camera={props.camera} />}
      </For>
    </defs>

    <For each={GRID_STEPS}>
      {x => <rect width="100%" height="100%" fill={`url(#grid-${x.step})`} />}
    </For>
  </g>
)
