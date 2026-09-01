import type { MessageResponse } from "@job-tracker/shared";
import { Elysia } from "elysia";
import { errorResponse, errorResponseWithStatus, parseId, requireAuth, verifyRequestCsrf } from "./support";
import type { RouteDependencies } from "./types";

export function applicationArchiveRoute({ applications, auth }: RouteDependencies) {
  return new Elysia().post("/api/applications/:id/archive", async ({ params, request, set }) => {
    const context = await requireAuth(auth, set, request);
    if (!context) return errorResponseWithStatus(set, 401, "UNAUTHENTICATED", "Unauthenticated");
    if (!(await verifyRequestCsrf(auth, set, request)))
      return errorResponseWithStatus(set, 403, "CSRF_ERROR", "Invalid CSRF token");
    const id = parseId(params.id, set);
    if (id === null) return errorResponse("INVALID_ID", "Application id must be a positive integer");
    if (!(await applications.archive(context.userId, id)))
      return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application not found or already archived");
    const response: MessageResponse = { data: { message: "Application archived" } };
    return response;
  });
}
