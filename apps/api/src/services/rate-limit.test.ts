import { describe, expect, it } from "vitest";
import { SlidingWindowRateLimiter } from "./rate-limit";

describe("SlidingWindowRateLimiter", () => {
  it("allows the configured number of attempts and reports retry time", () => {
    let now = 1_000;
    const limiter = new SlidingWindowRateLimiter({ limit: 2, windowMs: 1_000, now: () => now });

    expect(limiter.consume("login:user@example.com")).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(limiter.consume("login:user@example.com")).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(limiter.consume("login:user@example.com")).toEqual({ allowed: false, retryAfterSeconds: 1 });

    now = 2_001;
    expect(limiter.consume("login:user@example.com")).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("keeps independent keys independent", () => {
    const limiter = new SlidingWindowRateLimiter({ limit: 1, windowMs: 1_000, now: () => 1_000 });

    expect(limiter.consume("login:first@example.com").allowed).toBe(true);
    expect(limiter.consume("login:first@example.com").allowed).toBe(false);
    expect(limiter.consume("login:second@example.com").allowed).toBe(true);
  });
});
