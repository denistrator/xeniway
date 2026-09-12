import { type ApplicationListResponse, statusFilterSchema } from "@xeniway/shared";
import { Elysia } from "elysia";
import { errorResponseWithStatus, requireAuth, validationError } from "./support";
import type { RouteDependencies } from "./types";

export function applicationsListRoute({ applications, auth }: RouteDependencies) {
  return new Elysia().get("/api/applications", async ({ query, request, set }) => {
    const context = await requireAuth(auth, set, request);
    if (!context) return errorResponseWithStatus(set, 401, "UNAUTHENTICATED", "Unauthenticated");
    const status = statusFilterSchema.safeParse(query.status || undefined);
    if (!status.success) return validationError(set, status.error);
    const records = await applications.list(context.userId, { status: status.data });
    const response: ApplicationListResponse = { data: { applications: records } };
    return response;
  });
}
