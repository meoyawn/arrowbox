import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"

const mermaidRenderStub = fileURLToPath(
  new URL(
    "./src/app/diagram/data/mermaid/mermaid-render-stub.ts",
    import.meta.url,
  ),
)

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1500,
  },
  plugins: [
    {
      enforce: "pre",
      name: "mermaid-flowchart-parser-only",
      resolveId(source, importer) {
        if (
          source === "./chunk-FWX5IMBZ.mjs" &&
          importer?.includes(
            "/mermaid/dist/chunks/mermaid.core/chunk-PUDLZKDR.mjs",
          )
        ) {
          return mermaidRenderStub
        }
      },
    },
    tailwindcss(),
    solid(),
  ],
})
