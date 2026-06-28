import type { ZoomTransform } from "d3-zoom"
import { type Component, createEffect, onCleanup } from "solid-js"
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
const DOT_GRID_FILL = "#b7bec8"

const positiveModulo = (value: number, divisor: number): number =>
  ((value % divisor) + divisor) % divisor

const dotGridScreenSpacing = (
  camera: ZoomTransform,
  step: (typeof DOT_GRID_STEPS)[number],
): number => step * DOT_GRID_SIZE * camera.k

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

function resizeCanvas(canvas: HTMLCanvasElement): void {
  const dpr = devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width * dpr))
  const height = Math.max(1, Math.round(rect.height * dpr))

  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
}

function drawDotGrid(canvas: HTMLCanvasElement, camera: ZoomTransform): void {
  resizeCanvas(canvas)

  const dpr = devicePixelRatio || 1
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const width = canvas.width / dpr
  const height = canvas.height / dpr

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = DOT_GRID_FILL

  for (const step of visibleDotGridSteps(camera)) {
    const spacing = dotGridScreenSpacing(camera, step)
    const startX = positiveModulo(camera.x, spacing)
    const startY = positiveModulo(camera.y, spacing)

    ctx.globalAlpha = dotOpacity(spacing)

    for (let y = startY; y < height; y += spacing) {
      for (let x = startX; x < width; x += spacing) {
        ctx.beginPath()
        ctx.arc(x, y, DOT_GRID_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  ctx.globalAlpha = 1
}

export const DotGrid: Component<{ camera: ZoomTransform }> = props => {
  let canvasEl: HTMLCanvasElement | undefined
  let frame = 0

  createEffect(() => {
    const camera = props.camera
    if (!canvasEl) return

    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      if (canvasEl) drawDotGrid(canvasEl, camera)
    })
  })

  onCleanup(() => {
    cancelAnimationFrame(frame)
  })

  return (
    <canvas
      ref={canvasEl}
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}
