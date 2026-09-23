import {
  type AuthResponse,
  type CurrentUserResponse,
  loginInputSchema,
  type MessageResponse,
  registerInputSchema,
} from "@xeniway/shared";
import { Elysia } from "elysia";
import { AuthError } from "../../services/auth";
import { RedisRateLimitError } from "../../services/redis-rate-limit";
import {
  clearSessionCookie,
  errorResponseWithStatus,
  rateLimitError,
  rateLimitUnavailableError,
  readSessionId,
  setSessionCookie,
  validationError,
} from "../support";
import { requireAuthenticatedUser, requireValidCsrf } from "../support/auth-guard";
import type { AuthSessionRouteDependencies } from "../types";

export function authSessionRoutes({ auth, authRateLimiter, secureCookies }: AuthSessionRouteDependencies) {
  return new Elysia()
    .post("/api/auth/register", async ({ body, request, set }) => {
      const csrfError = await requireValidCsrf(auth, set, request);
      if (csrfError) return csrfError;
      const parsed = registerInputSchema.safeParse(body);
      if (!parsed.success) return validationError(set, parsed.error);
      try {
        const rateLimit = await authRateLimiter.consume(`register:${parsed.data.email}`);
        if (!rateLimit.allowed) return rateLimitError(set, rateLimit);

        const existingSession = await readSessionId(set, request);
        await auth.logout(existingSession);
        const result = await auth.register(parsed.data);
        setSessionCookie(set, result.sessionId, secureCookies);
        const response: AuthResponse = { data: { user: result.user, csrfToken: result.csrfToken } };
        set.status = 201;
        return response;
      } catch (error) {
        if (error instanceof RedisRateLimitError) return rateLimitUnavailableError(set);
        if (error instanceof AuthError && error.code === "EMAIL_TAKEN")
          return errorResponseWithStatus(set, 409, error.code, error.message);
        return errorResponseWithStatus(set, 500, "AUTHENTICATION_ERROR", "Unable to register user");
      }
    })
    .post("/api/auth/login", async ({ body, request, set }) => {
      const csrfError = await requireValidCsrf(auth, set, request);
      if (csrfError) return csrfError;
      const parsed = loginInputSchema.safeParse(body);
      if (!parsed.success) return validationError(set, parsed.error);
      try {
        const rateLimit = await authRateLimiter.consume(`login:${parsed.data.email}`);
        if (!rateLimit.allowed) return rateLimitError(set, rateLimit);

        const existingSession = await readSessionId(set, request);
        await auth.logout(existingSession);
        const result = await auth.login(parsed.data);
        setSessionCookie(set, result.sessionId, secureCookies);
        const response: AuthResponse = { data: { user: result.user, csrfToken: result.csrfToken } };
        return response;
      } catch (error) {
        if (error instanceof RedisRateLimitError) return rateLimitUnavailableError(set);
        if (error instanceof AuthError) return errorResponseWithStatus(set, 401, error.code, error.message);
        return errorResponseWithStatus(set, 500, "AUTHENTICATION_ERROR", "Unable to log in");
      }
    })
    .post("/api/auth/logout", async ({ request, set }) => {
      const csrfError = await requireValidCsrf(auth, set, request);
      if (csrfError) return csrfError;
      await auth.logout(await readSessionId(set, request));
      clearSessionCookie(set);
      const response: MessageResponse = { data: { message: "Logged out successfully" } };
      return response;
    })
    .get("/api/auth/me", async ({ request, set }) => {
      const authorization = await requireAuthenticatedUser(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const { user } = authorization.context;
      const response: CurrentUserResponse = { data: { user } };
      return response;
    });
}
