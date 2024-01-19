import solidDevTools from "solid-devtools/vite"
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  plugins: [
    solidDevTools({
      autoname: true,
    }),
    solid(),
  ],
})
