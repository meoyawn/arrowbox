import "./index.css"
import { render } from "solid-js/web"
import { TheApp } from "./diagram/TheApp"

const root = document.getElementById("root")
if (!root) throw new Error("No #root")

render(() => <TheApp />, root)
