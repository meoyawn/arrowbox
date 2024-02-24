import dompurify from "dompurify"
import { marked, Renderer } from "marked"

class ExternalLinkRenderer extends Renderer {
  /** https://github.com/markedjs/marked/issues/655#issuecomment-383226346 */
  link(href: string, title: string | null | undefined, text: string): string {
    const html = super.link(href, title, text)
    return href.startsWith("http")
      ? html.replace("<a", '<a target="_blank" rel="nofollow"')
      : html
  }
}

const renderer = new ExternalLinkRenderer()

export const md2html = (md: string): string => {
  const html = marked(md, { gfm: true, async: false, renderer }) as string

  return dompurify.sanitize(html, {
    /** prevent external links from stripping */
    ADD_ATTR: ["target"],
  })
}
