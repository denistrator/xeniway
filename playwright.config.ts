import { defineConfig, devices } from "@playwright/test";

const environment = {
  DATABASE_URL: "postgres://xeniway:xeniway@localhost:5432/xeniway",
  REDIS_URL: "redis://localhost:6379/15",
  PORT: "3102",
  API_PORT: "3102",
  VITE_PORT: "4175",
  APP_ORIGIN: "http://127.0.0.1:4175",
  CORS_ORIGIN: "http://127.0.0.1:4175",
};

export default defineConfig({
  globalSetup: "./tests/e2e/global-setup.ts",
  testDir: "./tests/e2e",
  testIgnore: "offline.spec.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4175",
    locale: "en-US",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "bun run --cwd apps/api dev",
      env: environment,
      url: "http://127.0.0.1:3102/api/health",
      reuseExistingServer: false,
    },
    {
      command: "bun run --cwd apps/web vite --host 127.0.0.1 --port 4175 --strictPort",
      env: environment,
      url: "http://127.0.0.1:4175",
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
