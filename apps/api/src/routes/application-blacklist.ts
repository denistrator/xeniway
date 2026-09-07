import { blacklistInputSchema, type MessageResponse } from "@job-tracker/shared";
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

export function applicationBlacklistRoute({ applications, auth }: RouteDependencies) {
  return new Elysia().post("/api/applications/:id/blacklist", async ({ body, params, request, set }) => {
    const context = await requireAuth(auth, set, request);
    if (!context) return errorResponseWithStatus(set, 401, "UNAUTHENTICATED", "Unauthenticated");
    if (!(await verifyRequestCsrf(auth, set, request)))
      return errorResponseWithStatus(set, 403, "CSRF_ERROR", "Invalid CSRF token");
    const id = parseId(params.id, set);
    if (id === null) return errorResponse("INVALID_ID", "Application id must be a positive integer");
    const parsed = blacklistInputSchema.safeParse(body);
    if (!parsed.success) return validationError(set, parsed.error);
    if (!(await applications.blacklist(context.userId, id, parsed.data.reason ?? null)))
      return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application not found or not active");
    const response: MessageResponse = { data: { message: "Application blacklisted" } };
    return response;
  });
}
