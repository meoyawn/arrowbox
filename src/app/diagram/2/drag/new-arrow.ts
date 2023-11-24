import { type NodeID } from "../../data/data"
import { type DragBehavior } from "./behavior"

export interface DragNewArrow {
  type: "newArrow"
  from: NodeID
}

export const dragNewArrow: DragBehavior<DragNewArrow> = {
  id: "newArrow",
}
