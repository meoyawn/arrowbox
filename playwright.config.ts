import { defineConfig } from "@playwright/test"

export default defineConfig({
  fullyParallel: true,
  testDir: ".",
  testMatch: "**/*.pw.ts",
  workers: 6,
  use: {
    baseURL: "http://127.0.0.1:4173",
  },
  webServer: {
    command: "bun vite --host 127.0.0.1 --port 4173",
    env: {
      NODE_ENV: "test",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: "http://127.0.0.1:4173",
  },
})
