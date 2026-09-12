import type { MessageResponse } from "@xeniway/shared";
import { Elysia } from "elysia";
import { clearSessionCookie, errorResponseWithStatus, readSessionId, verifyRequestCsrf } from "./support";
import type { RouteDependencies } from "./types";

export function authLogoutRoute({ auth }: RouteDependencies) {
  return new Elysia().post("/api/auth/logout", async ({ request, set }) => {
    if (!(await verifyRequestCsrf(auth, set, request)))
      return errorResponseWithStatus(set, 403, "CSRF_ERROR", "Invalid CSRF token");
    await auth.logout(await readSessionId(set, request));
    clearSessionCookie(set);
    const response: MessageResponse = { data: { message: "Logged out successfully" } };
    return response;
  });
}
