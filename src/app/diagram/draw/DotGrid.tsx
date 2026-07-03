import type { ZoomTransform } from "d3-zoom"
import type { Component, JSX } from "solid-js"
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
const DOT_GRID_RGB = "148 163 184"

export interface DotGridAxisDot {
  worldCoordinate: number
  screenCoordinate: number
}

const dotGridWorldSpacing = (step: (typeof DOT_GRID_STEPS)[number]): number =>
  step * DOT_GRID_SIZE

export const dotGridScreenSpacing = (
  camera: ZoomTransform,
  step: (typeof DOT_GRID_STEPS)[number],
): number => dotGridWorldSpacing(step) * camera.k

export function dotGridAxisDots(
  cameraCoordinate: number,
  cameraScale: number,
  step: (typeof DOT_GRID_STEPS)[number],
  screenLength: number,
): Array<DotGridAxisDot> {
  const worldSpacing = dotGridWorldSpacing(step)
  const minWorld = -cameraCoordinate / cameraScale
  const maxWorld = (screenLength - cameraCoordinate) / cameraScale
  const dots: Array<DotGridAxisDot> = []

  for (
    let index = Math.ceil(minWorld / worldSpacing);
    index * worldSpacing < maxWorld;
    index++
  ) {
    const worldCoordinate = index * worldSpacing
    dots.push({
      worldCoordinate,
      screenCoordinate: cameraCoordinate + worldCoordinate * cameraScale,
    })
  }

  return dots
}

function visibleDotGridSteps(
  camera: ZoomTransform,
): Array<(typeof DOT_GRID_STEPS)[number]> {
  return DOT_GRID_STEPS.filter(step => {
    const spacing = dotGridScreenSpacing(camera, step)

    return spacing > DOT_GRID_VISIBLE.min && spacing < DOT_GRID_VISIBLE.max
  })
}

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

const positiveRemainder = (value: number, divisor: number): number =>
  ((value % divisor) + divisor) % divisor

export function dotGridStyle(camera: ZoomTransform): JSX.CSSProperties {
  const layers = visibleDotGridSteps(camera).map(step => {
    const spacing = dotGridScreenSpacing(camera, step)
    const opacity = dotOpacity(spacing)
    const x = positiveRemainder(camera.x - spacing / 2, spacing)
    const y = positiveRemainder(camera.y - spacing / 2, spacing)

    return {
      image: `radial-gradient(circle at center, rgb(${DOT_GRID_RGB} / ${opacity}) ${DOT_GRID_RADIUS}px, transparent ${DOT_GRID_RADIUS}px)`,
      position: `${x}px ${y}px`,
      size: `${spacing}px ${spacing}px`,
    }
  })

  return {
    "background-image": layers.map(layer => layer.image).join(", "),
    "background-position": layers.map(layer => layer.position).join(", "),
    "background-repeat": "repeat",
    "background-size": layers.map(layer => layer.size).join(", "),
  }
}

export const DotGrid: Component<{ camera: ZoomTransform }> = props => (
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 h-full w-full"
    style={dotGridStyle(props.camera)}
  />
)
