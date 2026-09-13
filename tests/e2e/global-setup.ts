import { execFileSync } from "node:child_process";
import type { FullConfig } from "@playwright/test";

export default function globalSetup(_config: FullConfig): void {
  execFileSync("bun", ["run", "db:seed"], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}
