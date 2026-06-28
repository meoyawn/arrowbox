import { defineConfig } from "@playwright/test"

const playwrightPort = 4173
const playwrightBaseURL = `http://127.0.0.1:${playwrightPort}`

export default defineConfig({
  testDir: "src/",
  testMatch: "**/*.pw.ts",
  use: {
    baseURL: playwrightBaseURL,
  },
  webServer: {
    command: `bun vite dev --host 127.0.0.1 --port ${playwrightPort} --strictPort`,
    env: {
      NODE_ENV: "test",
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: playwrightBaseURL,
  },
})
