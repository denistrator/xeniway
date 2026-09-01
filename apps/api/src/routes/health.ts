import type { HealthResponse } from "@job-tracker/shared";
import { Elysia } from "elysia";
import { errorResponse } from "./support";
import type { RouteDependencies } from "./types";

export function healthRoute({ databaseHealth }: RouteDependencies) {
  return new Elysia().get("/api/health", async ({ set }) => {
    if (await databaseHealth()) {
      const response: HealthResponse = { status: "ok", database: "up" };
      return response;
    }
    set.status = 503;
    return errorResponse("DATABASE_UNAVAILABLE", "Database is unavailable");
  });
}
