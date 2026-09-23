import { expect, test } from "vitest";
import { rateLimitUnavailableError } from "./responses";

test("returns the shared rate-limit service unavailable error", () => {
  const set = { status: 200 } as { status: number };

  const response = rateLimitUnavailableError(set as never);

  expect(set.status).toBe(503);
  expect(response).toEqual({
    error: {
      code: "RATE_LIMIT_UNAVAILABLE",
      message: "Authentication rate limiting is unavailable",
    },
  });
});
