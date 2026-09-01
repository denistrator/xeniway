import { type AuthResponse, registerInputSchema } from "@job-tracker/shared";
import { Elysia } from "elysia";
import { AuthError } from "../services/auth";
import {
  errorResponseWithStatus,
  rateLimitError,
  readSessionId,
  setSessionCookie,
  validationError,
  verifyRequestCsrf,
} from "./support";
import type { RouteDependencies } from "./types";

export function authRegisterRoute({ auth, authRateLimiter }: RouteDependencies) {
  return new Elysia().post("/api/auth/register", async ({ body, request, set }) => {
    if (!(await verifyRequestCsrf(auth, set, request)))
      return errorResponseWithStatus(set, 403, "CSRF_ERROR", "Invalid CSRF token");
    const parsed = registerInputSchema.safeParse(body);
    if (!parsed.success) return validationError(set, parsed.error);
    const rateLimit = authRateLimiter.consume(`register:${parsed.data.email}`);
    if (!rateLimit.allowed) return rateLimitError(set, rateLimit);

    try {
      const existingSession = await readSessionId(set, request);
      await auth.logout(existingSession);
      const result = await auth.register(parsed.data);
      setSessionCookie(set, result.sessionId);
      const response: AuthResponse = { data: { user: result.user, csrfToken: result.csrfToken } };
      set.status = 201;
      return response;
    } catch (error) {
      if (error instanceof AuthError && error.code === "EMAIL_TAKEN")
        return errorResponseWithStatus(set, 409, error.code, error.message);
      return errorResponseWithStatus(set, 500, "AUTHENTICATION_ERROR", "Unable to register user");
    }
  });
}
