import type { ApplicationResponse } from "@xeniway/shared";
import { Elysia } from "elysia";
import { errorResponse, errorResponseWithStatus, parseId, requireAuth } from "./support";
import type { RouteDependencies } from "./types";

export function applicationDetailRoute({ applications, auth }: RouteDependencies) {
  return new Elysia().get("/api/applications/:id", async ({ params, request, set }) => {
    const context = await requireAuth(auth, set, request);
    if (!context) return errorResponseWithStatus(set, 401, "UNAUTHENTICATED", "Unauthenticated");
    const id = parseId(params.id, set);
    if (id === null) return errorResponse("INVALID_ID", "Application id must be a positive integer");
    const application = await applications.findById(context.userId, id);
    if (!application) return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application not found");
    const response: ApplicationResponse = { data: { application } };
    return response;
  });
}
