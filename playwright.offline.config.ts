import { defineConfig, devices } from "@playwright/test";

const environment = {
  DATABASE_URL: "postgres://xeniway:xeniway@localhost:5432/xeniway",
  REDIS_URL: "redis://localhost:6379/15",
  PORT: "3101", API_PORT: "3101",
  APP_ORIGIN: "http://127.0.0.1:4174", CORS_ORIGIN: "http://127.0.0.1:4174",
};
export default defineConfig({
  globalSetup: "./tests/e2e/global-setup.ts",
  testDir: "./tests/e2e", testMatch: "offline.spec.ts",
  workers: 1, timeout: 60_000, forbidOnly: Boolean(process.env.CI), retries: 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:4174", locale: "en-US", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: "bun run --cwd apps/api dev", env: environment, url: "http://127.0.0.1:3101/api/health", reuseExistingServer: false },
    { command: "bun run build && bun run --cwd apps/web vite preview --host 127.0.0.1 --port 4174 --strictPort", env: environment,
      url: "http://127.0.0.1:4174", timeout: 120_000, reuseExistingServer: false },
  ],
});
