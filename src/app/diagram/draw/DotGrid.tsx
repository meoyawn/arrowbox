import { type ZoomTransform } from "d3-zoom"
import { type Component, For } from "solid-js"
import { modulate } from "../../../lib/number.ts"

const DOT_GRID_SIZE = 16
const DOT_GRID_OPACITY = 0.82
const DOT_GRID_RADIUS = 1.25
const DOT_GRID_STEPS = [64, 16, 4, 1, 0.25] as const
const DOT_GRID_VISIBLE = {
  min: 8,
  fadeIn: 16,
  fadeOut: 48,
  max: 72,
} as const
const dotGridID = (step: (typeof DOT_GRID_STEPS)[number]): string =>
  `dot-grid-${String(step).replace(".", "-")}`
const positiveModulo = (value: number, divisor: number): number =>
  ((value % divisor) + divisor) % divisor
const dotGridScreenSpacing = (
  camera: ZoomTransform,
  step: (typeof DOT_GRID_STEPS)[number],
): number => step * DOT_GRID_SIZE * camera.k
const visibleDotGridSteps = (
  camera: ZoomTransform,
): Array<(typeof DOT_GRID_STEPS)[number]> =>
  DOT_GRID_STEPS.filter(
    step =>
      dotGridScreenSpacing(camera, step) > DOT_GRID_VISIBLE.min &&
      dotGridScreenSpacing(camera, step) < DOT_GRID_VISIBLE.max,
  )

const dotOpacity = (screenSpacing: number): number =>
  screenSpacing < DOT_GRID_VISIBLE.fadeIn
    ? modulate(
        screenSpacing,
        [DOT_GRID_VISIBLE.min, DOT_GRID_VISIBLE.fadeIn],
        [0, DOT_GRID_OPACITY],
        true,
      )
    : modulate(
        screenSpacing,
        [DOT_GRID_VISIBLE.fadeOut, DOT_GRID_VISIBLE.max],
        [DOT_GRID_OPACITY, 0],
        true,
      )

const DotGridPattern: Component<{
  camera: ZoomTransform
  step: (typeof DOT_GRID_STEPS)[number]
}> = props => {
  const spacing = () => dotGridScreenSpacing(props.camera, props.step)

  return (
    <pattern
      id={dotGridID(props.step)}
      patternUnits="userSpaceOnUse"
      width={spacing()}
      height={spacing()}
    >
      <circle
        cx={positiveModulo(props.camera.x, spacing())}
        cy={positiveModulo(props.camera.y, spacing())}
        r={DOT_GRID_RADIUS}
        fill="#b7bec8"
      />
    </pattern>
  )
}

const DotGridLayer: Component<{
  camera: ZoomTransform
  step: (typeof DOT_GRID_STEPS)[number]
}> = props => (
  <rect
    class="pointer-events-none"
    width="100%"
    height="100%"
    fill={`url(#${dotGridID(props.step)})`}
    opacity={dotOpacity(dotGridScreenSpacing(props.camera, props.step))}
  />
)

export const DotGrid: Component<{ camera: ZoomTransform }> = props => (
  <g>
    <defs>
      <For each={visibleDotGridSteps(props.camera)}>
        {step => <DotGridPattern camera={props.camera} step={step} />}
      </For>
    </defs>

    <For each={visibleDotGridSteps(props.camera)}>
      {step => <DotGridLayer camera={props.camera} step={step} />}
    </For>
  </g>
)
