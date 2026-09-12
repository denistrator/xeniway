import type { ApplicationListResponse } from "@xeniway/shared";
import { Elysia } from "elysia";
import { errorResponseWithStatus, requireAuth } from "./support";
import type { RouteDependencies } from "./types";

export function applicationsArchiveRoute({ applications, auth }: RouteDependencies) {
  return new Elysia().get("/api/applications/archive", async ({ request, set }) => {
    const context = await requireAuth(auth, set, request);
    if (!context) return errorResponseWithStatus(set, 401, "UNAUTHENTICATED", "Unauthenticated");
    const records = await applications.list(context.userId, { archived: true });
    const response: ApplicationListResponse = { data: { applications: records } };
    return response;
  });
}
