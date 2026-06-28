import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1500,
  },
  plugins: [tailwindcss(), solid()],
})
