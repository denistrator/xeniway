import { createCookieJar, parseCookie } from "elysia/cookies";
import type { ResponseSet } from "./responses";

export const SESSION_COOKIE = "session_id";
const SESSION_MAX_AGE = 2 * 60 * 60;

export async function readSessionId(set: ResponseSet, request: Request): Promise<string | undefined> {
  const cookies = await parseCookie(set, request.headers.get("cookie"));
  const value = cookies[SESSION_COOKIE]?.value;
  return typeof value === "string" ? value : undefined;
}

export function setSessionCookie(set: ResponseSet, value: string, secure: boolean): void {
  const cookies = createCookieJar(set, {});
  cookies[SESSION_COOKIE].set({
    value,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(set: ResponseSet): void {
  const cookies = createCookieJar(set, {});
  cookies[SESSION_COOKIE].remove();
}
