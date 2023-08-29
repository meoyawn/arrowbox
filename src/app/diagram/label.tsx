import { lazy } from "../../lib/ts"

const lazyEl = lazy(() => {
  const div = document.createElement("div")
  div.className = "prose invisible fixed left-0 top-0"
  document.body.append(div)
  return div
})

export const measureHtml = (html: string): DOMRect => {
  const el = lazyEl()
  el.innerHTML = html
  return el.getBoundingClientRect()
}
