import { type ZoomTransform } from "d3-zoom"
import { For, type Component, type JSX } from "solid-js"
import { modulate } from "../../lib/number"

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

function circleProps({
  camera,
  step,
}: Props): JSX.CircleSVGAttributes<SVGCircleElement> {
  const s = step.step * GRID_SIZE * camera.k
  const xo = 0.5 + camera.x * camera.k
  const yo = 0.5 + camera.y * camera.k
  return {
    cx: xo > 0 ? xo % s : s + (xo % s),
    cy: yo > 0 ? yo % s : s + (yo % s),
    opacity:
      camera.k < step.mid
        ? modulate(camera.k, [step.min, step.mid], [0, 1])
        : 1,
  }
}

function patternProps({
  camera,
  step,
}: Props): JSX.PatternSVGAttributes<SVGPatternElement> {
  const s = step.step * GRID_SIZE * camera.k
  return {
    id: `grid-${step.step}`,
    width: s,
    height: s,
  }
}

const Pattern: Component<Props> = props => (
  <pattern patternUnits="userSpaceOnUse" {...patternProps(props)}>
    <circle fill={"#6D6D6D"} r={1} {...circleProps(props)} />
  </pattern>
)

/**
 * https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/components/default-components/DefaultGrid.tsx
 */
export const DefaultGrid: Component<{
  camera: ZoomTransform
}> = props => (
  <svg
    class="pointer-events-none absolute left-0 top-0 h-full w-full touch-none"
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
