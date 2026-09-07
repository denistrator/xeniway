import { type AuthResponse, loginInputSchema } from "@job-tracker/shared";
import { Elysia } from "elysia";
import { AuthError } from "../services/auth";
import { RedisRateLimitError } from "../services/redis-rate-limit";
import {
  errorResponseWithStatus,
  rateLimitError,
  readSessionId,
  setSessionCookie,
  validationError,
  verifyRequestCsrf,
} from "./support";
import type { RouteDependencies } from "./types";

export function authLoginRoute({ auth, authRateLimiter }: RouteDependencies) {
  return new Elysia().post("/api/auth/login", async ({ body, request, set }) => {
    if (!(await verifyRequestCsrf(auth, set, request)))
      return errorResponseWithStatus(set, 403, "CSRF_ERROR", "Invalid CSRF token");
    const parsed = loginInputSchema.safeParse(body);
    if (!parsed.success) return validationError(set, parsed.error);
    try {
      const rateLimit = await authRateLimiter.consume(`login:${parsed.data.email}`);
      if (!rateLimit.allowed) return rateLimitError(set, rateLimit);

      const existingSession = await readSessionId(set, request);
      await auth.logout(existingSession);
      const result = await auth.login(parsed.data);
      setSessionCookie(set, result.sessionId);
      const response: AuthResponse = { data: { user: result.user, csrfToken: result.csrfToken } };
      return response;
    } catch (error) {
      if (error instanceof RedisRateLimitError)
        return errorResponseWithStatus(
          set,
          503,
          "RATE_LIMIT_UNAVAILABLE",
          "Authentication rate limiting is unavailable",
        );
      if (error instanceof AuthError) return errorResponseWithStatus(set, 401, error.code, error.message);
      return errorResponseWithStatus(set, 500, "AUTHENTICATION_ERROR", "Unable to log in");
    }
  });
}
