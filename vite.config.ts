import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  plugins: [tailwindcss(), solid()],
})
