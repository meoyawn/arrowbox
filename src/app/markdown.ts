import dompurify from "dompurify"
import { marked, Renderer, type Tokens } from "marked"

class ExternalLinkRenderer extends Renderer {
  /** https://github.com/markedjs/marked/issues/655#issuecomment-383226346 */
  link(token: Tokens.Link): string {
    const html = super.link(token)
    return token.href.startsWith("http")
      ? html.replace(/(<a href="[^"]*")/, '$1 rel="nofollow" target="_blank"')
      : html
  }
}

const renderer = new ExternalLinkRenderer()

export const md2html = (md: string): string => {
  const html = marked(md, { gfm: true, async: false, renderer })

  return dompurify.sanitize(html, {
    /** prevent external links from stripping */
    ADD_ATTR: ["target"],
  })
}
