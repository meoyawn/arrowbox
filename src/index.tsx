import "./index.css"
import { Route, Router, Routes } from "@solidjs/router"
import { render } from "solid-js/web"
import { Diagram2 } from "./app/diagram/2/Diagram2"
import { setupHotkeys } from "./app/diagram/hotkeys"
import { TheApp } from "./app/diagram/TheApp"
import { GraphList } from "./app/list/GraphList"

const root = document.getElementById("root")
if (!root) throw new Error("No #root")

render(
  () => (
    <Router>
      <Routes>
        <Route path="/" component={GraphList} />
        <Route path="/graph/:id" component={TheApp} />
        <Route path="/2" component={Diagram2} />
      </Routes>
    </Router>
  ),
  root,
)
