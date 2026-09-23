import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { createDependencies } from "./app-test-support";

describe("API route composition", () => {
  it("composes public, auth, preference, and application route domains", async () => {
    const dependencies = createDependencies();
    const app = createApp({
      ...dependencies,
      passwordResetTokens: undefined,
      passwordResetMailer: undefined,
    });
    const health = await app.handle(new Request("http://localhost/api/health"));
    const csrf = await app.handle(new Request("http://localhost/api/auth/csrf"));
    const preferences = await app.handle(new Request("http://localhost/api/user/preferences"));
    const applications = await app.handle(new Request("http://localhost/api/applications"));
    const unavailablePasswordReset = await app.handle(
      new Request("http://localhost/api/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "candidate@example.com" }),
      }),
    );

    expect([
      health.status,
      csrf.status,
      preferences.status,
      applications.status,
      unavailablePasswordReset.status,
    ]).toEqual([200, 200, 401, 401, 404]);
  });
});
