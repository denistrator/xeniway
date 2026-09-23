import type { ApplicationResponse, AuthResponse } from "@xeniway/shared";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { cookieValue, createCsrf, createDependencies, jsonRequest, register } from "./app-test-support";
import { SlidingWindowRateLimiter } from "./services/rate-limit";
import { RedisRateLimitError } from "./services/redis-rate-limit";

describe("authentication API", () => {
  it("uses the validated production mode for secure session cookies", async () => {
    const app = createApp({ ...createDependencies(), secureCookies: true });

    const response = await app.handle(new Request("http://localhost/api/auth/csrf"));

    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("returns a generic response for both known and unknown password reset emails", async () => {
    const app = createApp(createDependencies());
    const account = await register(app, "candidate@example.com");
    const csrf = { sessionId: account.sessionId, csrfToken: account.payload.data.csrfToken };

    const requestReset = (email: string) =>
      app.handle(
        jsonRequest(
          "http://localhost/api/auth/password-reset/request",
          { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) },
          csrf.sessionId,
          csrf.csrfToken,
        ),
      );

    const known = await requestReset("candidate@example.com");
    const unknown = await requestReset("missing@example.com");

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
  });

  it("registers, authenticates, and creates an application with CSRF protection", async () => {
    const app = createApp(createDependencies());
    const csrfResponse = await app.handle(new Request("http://localhost/api/auth/csrf"));
    const csrfToken = ((await csrfResponse.json()) as { data: { csrfToken: string } }).data.csrfToken;
    const csrfCookie = cookieValue(csrfResponse, "session_id");

    const authResponse = await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session_id=${csrfCookie}`,
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ email: "candidate@example.com", password: "password123" }),
      }),
    );
    expect(authResponse.status).toBe(201);
    const authPayload = (await authResponse.json()) as AuthResponse;
    expect(authPayload.data.user.email).toBe("candidate@example.com");
    const sessionCookie = cookieValue(authResponse, "session_id");

    const applicationResponse = await app.handle(
      new Request("http://localhost/api/applications", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session_id=${sessionCookie}`,
          "x-csrf-token": authPayload.data.csrfToken,
        },
        body: JSON.stringify({ company: "Acme", position: "Engineer", status: "interview" }),
      }),
    );
    expect(applicationResponse.status).toBe(201);
    expect(((await applicationResponse.json()) as ApplicationResponse).data.application.company).toBe("Acme");
  });

  it("rejects invalid CSRF and request payloads with stable errors", async () => {
    const app = createApp(createDependencies());
    const csrf = await createCsrf(app);
    const csrfFailure = await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `session_id=${csrf.sessionId}` },
        body: JSON.stringify({ email: "candidate@example.com", password: "password123" }),
      }),
    );
    expect(csrfFailure.status).toBe(403);
    expect(((await csrfFailure.json()) as { error: { code: string } }).error.code).toBe("CSRF_ERROR");

    const validationFailure = await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session_id=${csrf.sessionId}`,
          "x-csrf-token": csrf.csrfToken,
        },
        body: JSON.stringify({ email: "not-an-email", password: "short" }),
      }),
    );
    expect(validationFailure.status).toBe(422);
    expect(
      ((await validationFailure.json()) as { error: { code: string; fields: Record<string, string[]> } }).error,
    ).toMatchObject({
      code: "VALIDATION_ERROR",
      fields: { email: expect.any(Array), password: expect.any(Array) },
    });
  });

  it("rate limits repeated registration attempts", async () => {
    const dependencies = createDependencies();
    const app = createApp({
      ...dependencies,
      authRateLimiter: new SlidingWindowRateLimiter({ limit: 1, windowMs: 60_000 }),
    });
    const first = await register(app, "candidate@example.com");
    expect(first.response.status).toBe(201);

    const second = await register(app, "candidate@example.com");
    expect(second.response.status).toBe(429);
    expect(second.response.headers.get("retry-after")).toBe("60");
    expect((second.payload as unknown as { error: { code: string } }).error.code).toBe("RATE_LIMITED");
  });

  it("fails closed when the authentication rate limiter is unavailable", async () => {
    const dependencies = createDependencies();
    const app = createApp({
      ...dependencies,
      authRateLimiter: {
        async consume() {
          throw new RedisRateLimitError(new Error("Redis unavailable"));
        },
      },
    });
    const csrf = await createCsrf(app);

    const response = await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session_id=${csrf.sessionId}`,
          "x-csrf-token": csrf.csrfToken,
        },
        body: JSON.stringify({ email: "candidate@example.com", password: "password123" }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { code: "RATE_LIMIT_UNAVAILABLE", message: "Authentication rate limiting is unavailable" },
    });
  });
});
