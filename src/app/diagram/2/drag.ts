import { drag, type D3DragEvent } from "d3-drag"
import { isEl } from "../../../lib/dom"
import { type NodeID } from "../data/data"

type DragVariant =
  | {
      type: "new-arrow"
      from: NodeID
    }
  | {
      type: "brushing"
    }

type DragSubj = {
  x: number
  y: number
} & DragVariant

interface Devent extends D3DragEvent<HTMLElement, unknown, DragSubj> {
  sourceEvent: MouseEvent | TouchEvent
}

function dragSubj(
  this: HTMLElement,
  { sourceEvent, x, y }: Devent,
): DragSubj | 0 {
  const { target } = sourceEvent
  if (!isEl(target)) return 0
}

function onDrag({ subject }: Devent): 0 {
  switch (subject.type) {
    case "brushing":
      return 0

    case "new-arrow":
      return 0
  }
}

function onEnd(dev: Devent): void {
  switch (dev.subject.type) {
    case "new-arrow":
      // who are we hovering?
      break
  }
}

export const d3Drag = drag<HTMLDivElement, unknown>()
  .subject(dragSubj)
  .on("drag", onDrag)
  .on("end", onEnd)
