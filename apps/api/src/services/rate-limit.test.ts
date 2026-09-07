import { describe, expect, it } from "vitest";
import { type RateLimiter, SlidingWindowRateLimiter } from "./rate-limit";

describe("SlidingWindowRateLimiter", () => {
  it("allows the configured number of attempts and reports retry time", async () => {
    let now = 1_000;
    const limiter: RateLimiter = new SlidingWindowRateLimiter({ limit: 2, windowMs: 1_000, now: () => now });

    await expect(limiter.consume("login:user@example.com")).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
    await expect(limiter.consume("login:user@example.com")).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
    await expect(limiter.consume("login:user@example.com")).resolves.toEqual({ allowed: false, retryAfterSeconds: 1 });

    now = 2_001;
    await expect(limiter.consume("login:user@example.com")).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("keeps independent keys independent", async () => {
    const limiter: RateLimiter = new SlidingWindowRateLimiter({ limit: 1, windowMs: 1_000, now: () => 1_000 });

    await expect(limiter.consume("login:first@example.com")).resolves.toMatchObject({ allowed: true });
    await expect(limiter.consume("login:first@example.com")).resolves.toMatchObject({ allowed: false });
    await expect(limiter.consume("login:second@example.com")).resolves.toMatchObject({ allowed: true });
  });
});
