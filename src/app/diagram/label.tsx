/** .tsx because tailwind classes */
function element(): HTMLElement {
  const id = "measure"
  const found = document.getElementById(id)
  if (found) return found

  const div = document.createElement("div")
  div.id = id
  div.className = "prose invisible fixed max-w-prose left-0 top-0"
  document.body.append(div)
  return div
}

export const measureHtml = (html: string): DOMRect => {
  const el = element()
  el.innerHTML = html
  return el.getBoundingClientRect()
}
