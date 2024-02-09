import { Router } from "@solidjs/router"
import { render } from "solid-js/web"
import { GraphPage } from "./app/GraphPage.tsx"
import { ListPage } from "./app/ListPage.tsx"
import { DiagramPage } from "./app/diagram/draw/DiagramPage.tsx"
import { TypedRoute } from "./app/routes.tsx"
import "./index.css"

const root = document.getElementById("root")
if (!root) throw new Error("No #root")

render(
  () => (
    <Router>
      <TypedRoute path="/" component={DiagramPage} />
      <TypedRoute path="/list" component={ListPage} />
      <TypedRoute path="/graph/:id" component={GraphPage} />
    </Router>
  ),
  root,
)
