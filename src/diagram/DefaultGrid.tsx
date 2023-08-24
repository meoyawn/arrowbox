import { type ZoomTransform } from "d3-zoom"
import { For, type Component } from "solid-js"
import { modulate } from "../lib/number"

interface Step {
  min: number
  mid: number
  step: number
}

const GRID_STEPS: ReadonlyArray<Step> = [
  { min: -1, mid: 0.15, step: 64 },
  { min: 0.05, mid: 0.375, step: 16 },
  { min: 0.15, mid: 1, step: 4 },
  { min: 0.7, mid: 2.5, step: 1 },
]

const GRID_SIZE = 10

const Pattern: Component<{
  step: Step
  camera: ZoomTransform
}> = props => {
  const size = GRID_SIZE

  // eslint-disable-next-line solid/reactivity
  const { mid, min, step } = props.step

  const s = () => step * size * props.camera.k
  const xo = () => 0.5 + props.camera.x * props.camera.k
  const yo = () => 0.5 + props.camera.y * props.camera.k

  return (
    <pattern
      id={`grid-${step}`}
      width={s()}
      height={s()}
      patternUnits="userSpaceOnUse"
    >
      <circle
        fill={"#6D6D6D"}
        cx={xo() > 0 ? xo() % s() : s() + (xo() % s())}
        cy={yo() > 0 ? yo() % s() : s() + (yo() % s())}
        r={1}
        opacity={
          props.camera.k < mid
            ? modulate(props.camera.k, [min, mid], [0, 1])
            : 1
        }
      />
    </pattern>
  )
}

/**
 * https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/components/default-components/DefaultGrid.tsx
 */
export const DefaultGrid: Component<{
  camera: ZoomTransform
}> = props => {
  return (
    <svg
      class="pointer-events-none absolute left-0 top-0 z-20 h-full w-full touch-none"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <For each={GRID_STEPS}>
          {step => <Pattern step={step} camera={props.camera} />}
        </For>
      </defs>

      <For each={GRID_STEPS}>
        {({ step }) => (
          <rect width="100%" height="100%" fill={`url(#grid-${step})`} />
        )}
      </For>
    </svg>
  )
}
