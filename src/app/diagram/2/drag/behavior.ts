import { isEl } from "../../../../lib/dom"
import { isNodeID, type NodeID } from "../../data/data"
import { type D3Event, type DragSubj, type Variants } from "../drag"
import { type Store } from "../store"

export interface DragBehavior<Subj extends { type: keyof Variants }> {
  id: Subj["type"]

  subject(store: Store, e: D3Event<undefined>): DragSubj

  onDrag(store: Store, x: number, y: number, subj: Subj): Partial<Store>

  onEnd(store: Store, x: number, y: number, subj: Subj): Partial<Store>
}

export function getNID(ev: Event): NodeID | undefined {
  const { target } = ev
  if (!isEl(target)) return

  const node = target.closest("[data-nodeID]")
  const nid: NodeID | undefined = isEl(node)
    ? (node.dataset.nodeID as NodeID)
    : undefined

  if (isNodeID(nid)) {
    return nid
  }
}
