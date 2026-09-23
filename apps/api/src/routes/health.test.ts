import { expect, test } from "vitest";
import { healthRoute } from "./health";

test("health route only needs its health checks", async () => {
  const route = healthRoute({
    databaseHealth: async () => true,
    redisHealth: async () => true,
  });

  const response = await route.handle(new Request("http://localhost/api/health"));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", database: "up", redis: "up" });
});
