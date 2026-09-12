import { type ApplicationResponse, updateApplicationInputSchema } from "@xeniway/shared";
import { Elysia } from "elysia";
import {
  errorResponse,
  errorResponseWithStatus,
  parseId,
  requireAuth,
  validationError,
  verifyRequestCsrf,
} from "./support";
import type { RouteDependencies } from "./types";

export function applicationUpdateRoute({ applications, auth }: RouteDependencies) {
  return new Elysia().put("/api/applications/:id", async ({ body, params, request, set }) => {
    const context = await requireAuth(auth, set, request);
    if (!context) return errorResponseWithStatus(set, 401, "UNAUTHENTICATED", "Unauthenticated");
    if (!(await verifyRequestCsrf(auth, set, request)))
      return errorResponseWithStatus(set, 403, "CSRF_ERROR", "Invalid CSRF token");
    const id = parseId(params.id, set);
    if (id === null) return errorResponse("INVALID_ID", "Application id must be a positive integer");
    const parsed = updateApplicationInputSchema.safeParse(body);
    if (!parsed.success) return validationError(set, parsed.error);
    const application = await applications.update(context.userId, id, parsed.data);
    if (!application) return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application not found");
    const response: ApplicationResponse = { data: { application } };
    return response;
  });
}
