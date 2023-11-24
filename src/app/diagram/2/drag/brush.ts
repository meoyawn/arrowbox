import { type DragBehavior } from "./behavior"

export interface DragBrush {
  type: "brush"
}

export const dragBrush: DragBehavior<DragBrush> = {
  id: "brush",
}
