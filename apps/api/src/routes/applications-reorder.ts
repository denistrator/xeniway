import { type ApplicationListResponse, reorderApplicationsInputSchema } from "@job-tracker/shared";
import { Elysia } from "elysia";
import { errorResponseWithStatus, requireAuth, validationError, verifyRequestCsrf } from "./support";
import type { RouteDependencies } from "./types";

export function applicationsReorderRoute({ applications, auth }: RouteDependencies) {
  return new Elysia().post("/api/applications/reorder", async ({ body, request, set }) => {
    const context = await requireAuth(auth, set, request);
    if (!context) return errorResponseWithStatus(set, 401, "UNAUTHENTICATED", "Unauthenticated");
    if (!(await verifyRequestCsrf(auth, set, request)))
      return errorResponseWithStatus(set, 403, "CSRF_ERROR", "Invalid CSRF token");
    const parsed = reorderApplicationsInputSchema.safeParse(body);
    if (!parsed.success) return validationError(set, parsed.error);
    if (!(await applications.reorder(context.userId, parsed.data.status, parsed.data.applicationIds)))
      return errorResponseWithStatus(set, 400, "INVALID_ORDER", "Application order is invalid");
    const records = await applications.list(context.userId);
    const response: ApplicationListResponse = { data: { applications: records } };
    return response;
  });
}
