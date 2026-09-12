import { createHash } from "node:crypto";
import type { RateLimiter, RateLimitResult } from "./rate-limit";

const incrementScript = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return current
`;

export type RedisRateLimitClient = {
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>;
  ttl(key: string): Promise<number>;
};

type RedisRateLimiterOptions = {
  limit: number;
  windowMs: number;
};

export class RedisRateLimitError extends Error {
  constructor(cause: unknown) {
    super("Redis rate limiter is unavailable", { cause });
    this.name = "RedisRateLimitError";
  }
}

export class RedisRateLimiter implements RateLimiter {
  private readonly windowSeconds: number;

  constructor(
    private readonly client: RedisRateLimitClient,
    private readonly options: RedisRateLimiterOptions,
  ) {
    if (!Number.isInteger(options.limit) || options.limit < 1) throw new Error("Rate limit must be a positive integer");
    if (!Number.isFinite(options.windowMs) || options.windowMs <= 0)
      throw new Error("Rate-limit window must be positive");
    this.windowSeconds = Math.ceil(options.windowMs / 1_000);
  }

  async consume(key: string): Promise<RateLimitResult> {
    const separatorIndex = key.indexOf(":");
    const operation = separatorIndex === -1 ? "unknown" : key.slice(0, separatorIndex);
    const identifier = separatorIndex === -1 ? key : key.slice(separatorIndex + 1);
    const identifierHash = createHash("sha256").update(identifier).digest("hex");
    const redisKey = `xeniway:rate-limit:v1:${operation}:${identifierHash}`;

    try {
      const current = Number(
        await this.client.eval(incrementScript, {
          keys: [redisKey],
          arguments: [String(this.windowSeconds)],
        }),
      );
      if (!Number.isInteger(current)) throw new Error("Redis returned an invalid rate-limit count");
      if (current <= this.options.limit) return { allowed: true, retryAfterSeconds: 0 };

      const ttl = await this.client.ttl(redisKey);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, ttl > 0 ? ttl : this.windowSeconds),
      };
    } catch (error) {
      throw new RedisRateLimitError(error);
    }
  }
}
