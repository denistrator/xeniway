import {
  type MessageResponse,
  PASSWORD_RESET_REQUESTED_MESSAGE,
  passwordResetConfirmInputSchema,
  passwordResetRequestInputSchema,
} from "@xeniway/shared";
import { Elysia } from "elysia";
import { PasswordResetError } from "../../services/password-reset";
import { RedisRateLimitError } from "../../services/redis-rate-limit";
import { errorResponseWithStatus, rateLimitError, rateLimitUnavailableError, validationError } from "../support";
import { requireValidCsrf } from "../support/auth-guard";
import type { PasswordResetRouteDependencies } from "../types";

export function passwordResetRoutes({ auth, passwordReset }: PasswordResetRouteDependencies) {
  if (!passwordReset) return new Elysia();

  return new Elysia()
    .post("/api/auth/password-reset/request", async ({ body, request, set }) => {
      const csrfError = await requireValidCsrf(auth, set, request);
      if (csrfError) return csrfError;
      const parsed = passwordResetRequestInputSchema.safeParse(body);
      if (!parsed.success) return validationError(set, parsed.error);

      try {
        await passwordReset.request(parsed.data);
        const response: MessageResponse = { data: { message: PASSWORD_RESET_REQUESTED_MESSAGE } };
        return response;
      } catch (error) {
        if (error instanceof PasswordResetError && error.code === "PASSWORD_RESET_RATE_LIMITED") {
          return rateLimitError(set, { allowed: false, retryAfterSeconds: error.retryAfterSeconds ?? 60 });
        }
        if (error instanceof RedisRateLimitError) return rateLimitUnavailableError(set);
        return errorResponseWithStatus(set, 500, "PASSWORD_RESET_ERROR", "Unable to request a password reset");
      }
    })
    .post("/api/auth/password-reset/confirm", async ({ body, request, set }) => {
      const csrfError = await requireValidCsrf(auth, set, request);
      if (csrfError) return csrfError;
      const parsed = passwordResetConfirmInputSchema.safeParse(body);
      if (!parsed.success) return validationError(set, parsed.error);

      try {
        await passwordReset.confirm(parsed.data);
        const response: MessageResponse = { data: { message: "Your password has been reset." } };
        return response;
      } catch (error) {
        if (error instanceof PasswordResetError && error.code === "PASSWORD_RESET_INVALID")
          return errorResponseWithStatus(set, 400, error.code, "This password reset link is invalid or expired");
        return errorResponseWithStatus(set, 500, "PASSWORD_RESET_ERROR", "Unable to reset password");
      }
    });
}
