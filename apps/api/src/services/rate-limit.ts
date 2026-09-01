export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type RateLimiterOptions = {
  limit: number;
  windowMs: number;
  now?: () => number;
  maxEntries?: number;
};

type Entry = { count: number; resetAt: number };

export class SlidingWindowRateLimiter {
  private readonly entries = new Map<string, Entry>();
  private readonly now: () => number;
  private readonly maxEntries: number;

  constructor(private readonly options: RateLimiterOptions) {
    if (!Number.isInteger(options.limit) || options.limit < 1) throw new Error("Rate limit must be a positive integer");
    if (!Number.isFinite(options.windowMs) || options.windowMs <= 0)
      throw new Error("Rate-limit window must be positive");
    this.now = options.now ?? Date.now;
    this.maxEntries = options.maxEntries ?? 10_000;
  }

  consume(key: string): RateLimitResult {
    const currentTime = this.now();
    const current = this.entries.get(key);
    if (!current || current.resetAt <= currentTime) {
      this.prune(currentTime);
      this.entries.set(key, { count: 1, resetAt: currentTime + this.options.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (current.count >= this.options.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - currentTime) / 1_000)),
      };
    }

    current.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  private prune(currentTime: number): void {
    if (this.entries.size < this.maxEntries) return;
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= currentTime) this.entries.delete(key);
      if (this.entries.size < this.maxEntries) break;
    }
  }
}
