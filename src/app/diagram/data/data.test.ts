import { zoomIdentity } from "d3-zoom"
import { test } from "vitest"
import { addNode } from "./edit"

test("produce with patches", () => {
  console.log(addNode({ camera: zoomIdentity, data: { nodes: {} } }, [1, 2]))
})
