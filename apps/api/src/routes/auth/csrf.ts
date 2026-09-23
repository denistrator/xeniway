import type { CsrfResponse } from "@xeniway/shared";
import { Elysia } from "elysia";
import { readSessionId, setSessionCookie } from "../support";
import type { CsrfRouteDependencies } from "../types";

export function csrfRoute({ auth, secureCookies }: CsrfRouteDependencies) {
  return new Elysia().get("/api/auth/csrf", async ({ request, set }) => {
    const currentSessionId = await readSessionId(set, request);
    const currentToken = await auth.getCsrfToken(currentSessionId);
    if (currentSessionId && currentToken) {
      const response: CsrfResponse = { data: { csrfToken: currentToken } };
      return response;
    }

    const csrfSession = await auth.createCsrfSession();
    setSessionCookie(set, csrfSession.sessionId, secureCookies);
    const response: CsrfResponse = { data: { csrfToken: csrfSession.csrfToken } };
    return response;
  });
}
