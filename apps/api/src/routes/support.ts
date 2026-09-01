import type { ApiError } from "@job-tracker/shared";
import type { Context } from "elysia";
import { createCookieJar, parseCookie } from "elysia/cookies";
import type { AuthService } from "../services/auth";
import type { RateLimitResult } from "../services/rate-limit";

export const SESSION_COOKIE = "session_id";
export const CSRF_HEADER = "x-csrf-token";
const SESSION_MAX_AGE = 2 * 60 * 60;

type AuthContext = { sessionId: string; userId: number };
export type ResponseSet = Context["set"];

export async function readSessionId(set: ResponseSet, request: Request): Promise<string | undefined> {
  const cookies = await parseCookie(set, request.headers.get("cookie"));
  const value = cookies[SESSION_COOKIE]?.value;
  return typeof value === "string" ? value : undefined;
}

export async function requireAuth(auth: AuthService, set: ResponseSet, request: Request): Promise<AuthContext | null> {
  const sessionId = await readSessionId(set, request);
  const user = await auth.getCurrentUser(sessionId);
  return user && sessionId ? { sessionId, userId: user.id } : null;
}

export async function verifyRequestCsrf(auth: AuthService, set: ResponseSet, request: Request): Promise<boolean> {
  return auth.verifyCsrf(await readSessionId(set, request), request.headers.get(CSRF_HEADER) ?? undefined);
}

export function setSessionCookie(set: ResponseSet, value: string): void {
  const cookies = createCookieJar(set, {});
  cookies[SESSION_COOKIE].set({
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(set: ResponseSet): void {
  const cookies = createCookieJar(set, {});
  cookies[SESSION_COOKIE].remove();
}

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

export function rateLimitError(set: ResponseSet, result: RateLimitResult) {
  set.status = 429;
  set.headers["retry-after"] = String(result.retryAfterSeconds);
  return errorResponse("RATE_LIMITED", "Too many authentication attempts");
}
