import dompurify from "dompurify"
import { marked } from "marked"

export const md2html = (md: string): string =>
  dompurify.sanitize(marked(md, { gfm: true, async: false }) as string)
