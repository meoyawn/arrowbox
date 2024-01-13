import "./index.css"
import { Route, Router } from "@solidjs/router"
import { render } from "solid-js/web"
import { TheApp } from "./app/diagram/TheApp.tsx"

const root = document.getElementById("root")
if (!root) throw new Error("No #root")

render(
  () => (
    <Router>
      <Route path="/" component={TheApp} />
    </Router>
  ),
  root,
)
