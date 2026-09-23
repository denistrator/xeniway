import type { ApiError } from "@xeniway/shared";
import type { Context } from "elysia";
import type { RateLimitResult } from "../../services/rate-limit";

export type ResponseSet = Context["set"];

export function parseId(value: string, set: ResponseSet): number | null {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    set.status = 400;
    return null;
  }
  return id;
}

export function validationError(set: ResponseSet, error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  set.status = 422;
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    fields[field] = [...(fields[field] ?? []), issue.message];
  }
  return errorResponse("VALIDATION_ERROR", "Validation failed", fields);
}

export function errorResponse(code: string, message: string, fields?: Record<string, string[]>): ApiError {
  return { error: { code, message, ...(fields ? { fields } : {}) } };
}

export function errorResponseWithStatus(set: ResponseSet, status: number, code: string, message: string) {
  set.status = status;
  return errorResponse(code, message);
}

export function rateLimitUnavailableError(set: ResponseSet) {
  return errorResponseWithStatus(set, 503, "RATE_LIMIT_UNAVAILABLE", "Authentication rate limiting is unavailable");
}

export function rateLimitError(set: ResponseSet, result: RateLimitResult) {
  set.status = 429;
  set.headers["retry-after"] = String(result.retryAfterSeconds);
  return errorResponse("RATE_LIMITED", "Too many authentication attempts");
}
