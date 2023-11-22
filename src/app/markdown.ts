import rehypeExternalLinks from "rehype-external-links"
import rehypeSanitize from "rehype-sanitize"
import rehypeStringify from "rehype-stringify"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"

const p = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeExternalLinks, { target: "_blank", rel: "noreferrer" })
  .use(rehypeSanitize)
  .use(rehypeStringify)
  .freeze()

export const md2html = (md: string): string => p.processSync(md).toString()
