import { defineConfig, devices } from "@playwright/test"

const playwrightPort = 5173
const playwrightBaseURL = `http://127.0.0.1:${playwrightPort}`

export default defineConfig({
  fullyParallel: true,
  testDir: "src/",
  testMatch: "**/*.pw.ts",
  workers: 8,
  projects: [
    {
      name: "desktop-chrome",
      testIgnore: "**/*.ios.pw.ts",
      use: devices["Desktop Chrome"],
    },
    {
      name: "iphone-13",
      use: devices["iPhone 13"],
    },
  ],
  use: {
    baseURL: playwrightBaseURL,
  },
})
