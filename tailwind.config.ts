import typography from "@tailwindcss/typography"
import { type Config } from "tailwindcss"

// noinspection JSUnusedGlobalSymbols
export default {
  content: ["src/**/*.{js,jsx,ts,tsx}", "index.html"],
  theme: {
    extend: {},
  },
  plugins: [typography],
} satisfies Config
