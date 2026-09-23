import type { ApiError } from "@xeniway/shared";
import type { AuthService } from "../../services/auth";
import { type AuthContext, requireAuth, verifyRequestCsrf } from "./auth";
import { errorResponseWithStatus, type ResponseSet } from "./responses";

type GuardSuccess = { ok: true; context: AuthContext };
type GuardFailure = { ok: false; response: ApiError };
type GuardResult = GuardSuccess | GuardFailure;

export async function requireAuthenticatedUser(
  auth: AuthService,
  set: ResponseSet,
  request: Request,
): Promise<GuardResult> {
  const context = await requireAuth(auth, set, request);
  if (!context) {
    return {
      ok: false,
      response: errorResponseWithStatus(set, 401, "UNAUTHENTICATED", "Unauthenticated"),
    };
  }

  return { ok: true, context };
}

export async function requireAuthenticatedMutation(
  auth: AuthService,
  set: ResponseSet,
  request: Request,
): Promise<GuardResult> {
  const result = await requireAuthenticatedUser(auth, set, request);
  if (!result.ok) return result;

  const csrfError = await requireValidCsrf(auth, set, request);
  if (csrfError) return { ok: false, response: csrfError };

  return result;
}

export async function requireValidCsrf(
  auth: AuthService,
  set: ResponseSet,
  request: Request,
): Promise<ApiError | null> {
  if (await verifyRequestCsrf(auth, set, request)) return null;
  return errorResponseWithStatus(set, 403, "CSRF_ERROR", "Invalid CSRF token");
}
