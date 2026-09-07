import type { ApplicationListResponse } from "@job-tracker/shared";
import { Elysia } from "elysia";
import { errorResponseWithStatus, requireAuth } from "./support";
import type { RouteDependencies } from "./types";

export function applicationsBlacklistRoute({ applications, auth }: RouteDependencies) {
  return new Elysia().get("/api/applications/blacklist", async ({ request, set }) => {
    const context = await requireAuth(auth, set, request);
    if (!context) return errorResponseWithStatus(set, 401, "UNAUTHENTICATED", "Unauthenticated");
    const records = await applications.listBlacklisted(context.userId);
    const response: ApplicationListResponse = { data: { applications: records } };
    return response;
  });
}
