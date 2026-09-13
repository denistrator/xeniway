import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev",
    env: {
      DATABASE_URL: "postgres://xeniway:xeniway@localhost:5432/xeniway",
      REDIS_URL: "redis://localhost:6379/15",
      PORT: "3100",
      APP_ORIGIN: "http://127.0.0.1:4173",
      API_PORT: "3100",
      VITE_PORT: "4173",
      CORS_ORIGIN: "http://127.0.0.1:4173",
    },
    url: "http://127.0.0.1:4173",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
