import { Router } from "@solidjs/router"
import { render } from "solid-js/web"
import { RedirectGraphPage } from "./app/RedirectGraphPage.tsx"
import { ListPage } from "./app/ListPage.tsx"
import { DiagramPage } from "./app/diagram/DiagramPage.tsx"
import type { GraphID } from "./app/diagram/data/data.ts"
import { TypedRoute } from "./app/routes.tsx"
import "./index.css"

const root = document.getElementById("root")
if (!root) throw new Error("No #root")

render(
  () => (
    <Router>
      <TypedRoute path="/" component={DiagramPage} />
      <TypedRoute path="/list" component={ListPage} />
      <TypedRoute path={`/graph/${":id" as GraphID}`} component={RedirectGraphPage} />
    </Router>
  ),
  root,
)
