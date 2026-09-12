import type { UserPreferencesResponse } from "@xeniway/shared";
import { Elysia } from "elysia";
import { toUserPreferences } from "../db/repository";
import { errorResponseWithStatus, requireAuth, verifyRequestCsrf } from "./support";
import type { RouteDependencies } from "./types";

export function userPreferencesRoute({ preferences, auth }: RouteDependencies) {
  return new Elysia()
    .get("/api/user/preferences", async ({ request, set }) => {
      const context = await requireAuth(auth, set, request);
      if (!context) return errorResponseWithStatus(set, 401, "UNAUTHENTICATED", "Unauthenticated");
      const row = await preferences.findByUserId(context.userId);
      const response: UserPreferencesResponse = {
        data: {
          preferences: row
            ? toUserPreferences(row)
            : { wasIntroduced: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        },
      };
      return response;
    })
    .post("/api/user/preferences/introduced", async ({ request, set }) => {
      const context = await requireAuth(auth, set, request);
      if (!context) return errorResponseWithStatus(set, 401, "UNAUTHENTICATED", "Unauthenticated");
      if (!(await verifyRequestCsrf(auth, set, request)))
        return errorResponseWithStatus(set, 403, "CSRF_ERROR", "Invalid CSRF token");
      const row = await preferences.markIntroduced(context.userId);
      const response: UserPreferencesResponse = { data: { preferences: toUserPreferences(row) } };
      return response;
    });
}
