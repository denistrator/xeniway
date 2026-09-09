import {
  type MessageResponse,
  PASSWORD_RESET_REQUESTED_MESSAGE,
  passwordResetRequestInputSchema,
} from "@job-tracker/shared";
import { Elysia } from "elysia";
import { PasswordResetError } from "../services/password-reset";
import { RedisRateLimitError } from "../services/redis-rate-limit";
import { errorResponseWithStatus, rateLimitError, validationError, verifyRequestCsrf } from "./support";
import type { RouteDependencies } from "./types";

export function authPasswordResetRequestRoute({ auth, passwordReset }: RouteDependencies) {
  return new Elysia().post("/api/auth/password-reset/request", async ({ body, request, set }) => {
    if (!(await verifyRequestCsrf(auth, set, request)))
      return errorResponseWithStatus(set, 403, "CSRF_ERROR", "Invalid CSRF token");
    const parsed = passwordResetRequestInputSchema.safeParse(body);
    if (!parsed.success) return validationError(set, parsed.error);
    if (!passwordReset)
      return errorResponseWithStatus(set, 503, "PASSWORD_RESET_UNAVAILABLE", "Password reset is unavailable");

    try {
      await passwordReset.request(parsed.data);
      const response: MessageResponse = { data: { message: PASSWORD_RESET_REQUESTED_MESSAGE } };
      return response;
    } catch (error) {
      if (error instanceof PasswordResetError && error.code === "PASSWORD_RESET_RATE_LIMITED") {
        return rateLimitError(set, { allowed: false, retryAfterSeconds: error.retryAfterSeconds ?? 60 });
      }
      if (error instanceof RedisRateLimitError)
        return errorResponseWithStatus(
          set,
          503,
          "RATE_LIMIT_UNAVAILABLE",
          "Authentication rate limiting is unavailable",
        );
      return errorResponseWithStatus(set, 500, "PASSWORD_RESET_ERROR", "Unable to request a password reset");
    }
  });
}
