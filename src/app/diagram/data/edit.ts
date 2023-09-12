import { type Vec2 } from "../../../lib/geometry"
import { genID, patch, worldPos, type TheDiagram } from "./data"
import { setStore } from "./state"

export const addNode = (p: Vec2): void =>
  setStore(s => {
    const id = genID("n")
    const [x, y] = worldPos(s.camera, p)

    return {
      data: patch(s.data, (data: TheDiagram) => {
        data.nodes[id] = {
          id,
          text: "",
          rect: { x, y, width: 100, height: 100 },
          children: [],
        }
      }),
    }
  })
