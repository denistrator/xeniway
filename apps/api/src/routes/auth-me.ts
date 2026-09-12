import type { CurrentUserResponse } from "@xeniway/shared";
import { Elysia } from "elysia";
import { errorResponseWithStatus, readSessionId } from "./support";
import type { RouteDependencies } from "./types";

export function authMeRoute({ auth }: RouteDependencies) {
  return new Elysia().get("/api/auth/me", async ({ request, set }) => {
    const user = await auth.getCurrentUser(await readSessionId(set, request));
    if (!user) return errorResponseWithStatus(set, 401, "UNAUTHENTICATED", "Unauthenticated");
    const response: CurrentUserResponse = { data: { user } };
    return response;
  });
}
