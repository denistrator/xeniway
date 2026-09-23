import { type UserPreferencesResponse, updateUserPreferencesInputSchema } from "@xeniway/shared";
import { Elysia } from "elysia";
import { toUserPreferences } from "../db/repository";
import { validationError } from "./support";
import { requireAuthenticatedMutation, requireAuthenticatedUser } from "./support/auth-guard";
import type { PreferencesRouteDependencies } from "./types";

export function preferencesRoute({ preferences, auth }: PreferencesRouteDependencies) {
  return new Elysia()
    .get("/api/user/preferences", async ({ request, set }) => {
      const authorization = await requireAuthenticatedUser(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const row = await preferences.findByUserId(authorization.context.userId);
      const response: UserPreferencesResponse = {
        data: {
          preferences: row
            ? toUserPreferences(row)
            : {
                wasIntroduced: false,
                selectedLanguage: null,
                selectedTheme: null,
                selectedFormPresentation: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
        },
      };
      return response;
    })
    .patch("/api/user/preferences", async ({ request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const body = await request.json().catch(() => null);
      const parsed = updateUserPreferencesInputSchema.safeParse(body);
      if (!parsed.success) return validationError(set, parsed.error);
      const row = await preferences.update(authorization.context.userId, parsed.data);
      const response: UserPreferencesResponse = { data: { preferences: toUserPreferences(row) } };
      return response;
    })
    .post("/api/user/preferences/introduced", async ({ request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const row = await preferences.markIntroduced(authorization.context.userId);
      const response: UserPreferencesResponse = { data: { preferences: toUserPreferences(row) } };
      return response;
    });
}
