import type { MessageResponse } from "@xeniway/shared";
import { Elysia } from "elysia";
import { errorResponse, errorResponseWithStatus, parseId, requireAuth, verifyRequestCsrf } from "./support";
import type { RouteDependencies } from "./types";

export function applicationDeleteRoute({ applications, auth }: RouteDependencies) {
  return new Elysia().delete("/api/applications/:id", async ({ params, request, set }) => {
    const context = await requireAuth(auth, set, request);
    if (!context) return errorResponseWithStatus(set, 401, "UNAUTHENTICATED", "Unauthenticated");
    if (!(await verifyRequestCsrf(auth, set, request)))
      return errorResponseWithStatus(set, 403, "CSRF_ERROR", "Invalid CSRF token");
    const id = parseId(params.id, set);
    if (id === null) return errorResponse("INVALID_ID", "Application id must be a positive integer");
    if (await applications.findById(context.userId, id))
      return errorResponseWithStatus(set, 409, "ACTIVE_APPLICATION", "Archive the application before deleting it");
    if (!(await applications.permanentDelete(context.userId, id)))
      return errorResponseWithStatus(set, 404, "NOT_FOUND", "Archived application not found");
    const response: MessageResponse = { data: { message: "Application deleted" } };
    return response;
  });
}
