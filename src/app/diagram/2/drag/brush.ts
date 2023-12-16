import type { BBox } from "rbush"
import { type Vec2 } from "../../../../lib/geometry"
import { worldPos } from "../../data/data"
import { brushSelect } from "../brushing.ts"
import { type D3Event, type DragSubj } from "../drag"
import { type Store } from "../store"
import { type DragBehavior } from "./behavior"

export interface DragBrush {
  type: "brush"
  world: Vec2
}

export const dragBrush: DragBehavior<DragBrush> = {
  id: "brush",
  subject(store: Store, { x, y }: D3Event<undefined>): DragSubj {
    const world = worldPos(store.camera, [x, y])
    return { type: "brush", world, x, y }
  },
  onDrag(store: Store, x: number, y: number, subj: DragBrush): Partial<Store> {
    const [swx, swy] = subj.world
    const [ewx, ewy] = worldPos(store.camera, [x, y])
    const brush: BBox = {
      minX: Math.min(swx, ewx),
      minY: Math.min(swy, ewy),
      maxX: Math.max(swx, ewx),
      maxY: Math.max(swy, ewy),
    }
    return {
      brush,
      selected: brushSelect(store.tree.index.bush, brush),
    }
  },

  onEnd(store: Store, x: number, y: number, subj: DragBrush): Partial<Store> {
    return { brush: undefined }
  },
}
