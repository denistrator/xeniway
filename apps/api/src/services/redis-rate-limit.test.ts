import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { RedisRateLimitError, RedisRateLimiter } from "./redis-rate-limit";

function createClient(result: number, ttl = 900) {
  const calls: Array<{ script: string; options: { keys: string[]; arguments: string[] } }> = [];
  return {
    calls,
    client: {
      async eval(script: string, options: { keys: string[]; arguments: string[] }) {
        calls.push({ script, options });
        return result;
      },
      async ttl() {
        return ttl;
      },
    },
  };
}

describe("RedisRateLimiter", () => {
  it("increments a private fixed-window key and allows requests under the limit", async () => {
    const { client, calls } = createClient(2);
    const limiter = new RedisRateLimiter(client, { limit: 5, windowMs: 900_000 });

    await expect(limiter.consume("login:user@example.com")).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.script).toContain("INCR");
    expect(calls[0]?.script).toContain("EXPIRE");
    const expectedHash = createHash("sha256").update("user@example.com").digest("hex");
    expect(calls[0]?.options).toEqual({
      keys: [`job-tracker:rate-limit:v1:login:${expectedHash}`],
      arguments: ["900"],
    });
    expect(calls[0]?.options.keys[0]).not.toContain("user@example.com");
  });

  it("blocks over-limit requests using the Redis TTL", async () => {
    const { client } = createClient(6, 317);
    const limiter = new RedisRateLimiter(client, { limit: 5, windowMs: 900_000 });

    await expect(limiter.consume("register:user@example.com")).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 317,
    });
  });

  it("wraps Redis failures as infrastructure errors", async () => {
    const client = {
      async eval() {
        throw new Error("connection lost");
      },
      async ttl() {
        return 1;
      },
    };
    const limiter = new RedisRateLimiter(client, { limit: 5, windowMs: 900_000 });

    await expect(limiter.consume("login:user@example.com")).rejects.toBeInstanceOf(RedisRateLimitError);
  });
});
