import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { createDependencies } from "./app-test-support";

describe("health API", () => {
  it("reports database and Redis health", async () => {
    const app = createApp({
      ...createDependencies(),
      health: async () => true,
      redisHealth: async () => true,
    });

    const response = await app.handle(new Request("http://localhost/api/health"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", database: "up", redis: "up" });
  });

  it("reports Redis health failures", async () => {
    const app = createApp({
      ...createDependencies(),
      health: async () => true,
      redisHealth: async () => false,
    });

    const response = await app.handle(new Request("http://localhost/api/health"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: { code: "REDIS_UNAVAILABLE", message: "Redis is unavailable" } });
  });
});
