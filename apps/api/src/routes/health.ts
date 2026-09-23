import type { HealthResponse } from "@xeniway/shared";
import { Elysia } from "elysia";
import { errorResponse } from "./support";
import type { HealthRouteDependencies } from "./types";

export function healthRoute({ databaseHealth, redisHealth }: HealthRouteDependencies) {
  return new Elysia().get("/api/health", async ({ set }) => {
    const [databaseIsHealthy, redisIsHealthy] = await Promise.all([databaseHealth(), redisHealth()]);
    if (!databaseIsHealthy) {
      set.status = 503;
      return errorResponse("DATABASE_UNAVAILABLE", "Database is unavailable");
    }
    if (!redisIsHealthy) {
      set.status = 503;
      return errorResponse("REDIS_UNAVAILABLE", "Redis is unavailable");
    }
    const response: HealthResponse = { status: "ok", database: "up", redis: "up" };
    return response;
  });
}
