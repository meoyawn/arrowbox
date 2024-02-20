import dompurify from "dompurify"
import { marked, Renderer } from "marked"

class ExternalLinkRenderer extends Renderer {
  link = (
    href: string,
    title: string | null | undefined,
    text: string,
  ): string =>
    super
      .link(href, title, text)
      .replace(/^<a /, '<a target="_blank" rel="nofollow" ')
}

const renderer = new ExternalLinkRenderer()

export const md2html = (md: string): string =>
  dompurify.sanitize(
    marked(md, { gfm: true, async: false, renderer }) as string,
    { ADD_ATTR: ["target"] },
  )
