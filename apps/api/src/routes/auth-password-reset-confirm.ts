import { type MessageResponse, passwordResetConfirmInputSchema } from "@job-tracker/shared";
import { Elysia } from "elysia";
import { PasswordResetError } from "../services/password-reset";
import { errorResponseWithStatus, validationError, verifyRequestCsrf } from "./support";
import type { RouteDependencies } from "./types";

export function authPasswordResetConfirmRoute({ auth, passwordReset }: RouteDependencies) {
  return new Elysia().post("/api/auth/password-reset/confirm", async ({ body, request, set }) => {
    if (!(await verifyRequestCsrf(auth, set, request)))
      return errorResponseWithStatus(set, 403, "CSRF_ERROR", "Invalid CSRF token");
    const parsed = passwordResetConfirmInputSchema.safeParse(body);
    if (!parsed.success) return validationError(set, parsed.error);
    if (!passwordReset)
      return errorResponseWithStatus(set, 503, "PASSWORD_RESET_UNAVAILABLE", "Password reset is unavailable");

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
