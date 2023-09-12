import { type Vec2 } from "../../../lib/geometry"
import { genID, patch, worldPos, type TheDiagram } from "./data"
import { setStore, store } from "./state"

export const addNode = (p: Vec2): void => {
  const { camera, data } = store
  const id = genID("n")
  const [x, y] = worldPos(camera, p)

  setStore({
    data: patch(data, (data: TheDiagram) => {
      data.nodes[id] = {
        id,
        text: "",
        rect: { x, y, width: 100, height: 100 },
        children: [],
      }
    }),
  })
}
