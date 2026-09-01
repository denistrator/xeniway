import { type ApplicationResponse, createApplicationInputSchema } from "@job-tracker/shared";
import { Elysia } from "elysia";
import { errorResponseWithStatus, requireAuth, validationError, verifyRequestCsrf } from "./support";
import type { RouteDependencies } from "./types";

export function applicationCreateRoute({ applications, auth }: RouteDependencies) {
  return new Elysia().post("/api/applications", async ({ body, request, set }) => {
    const context = await requireAuth(auth, set, request);
    if (!context) return errorResponseWithStatus(set, 401, "UNAUTHENTICATED", "Unauthenticated");
    if (!(await verifyRequestCsrf(auth, set, request)))
      return errorResponseWithStatus(set, 403, "CSRF_ERROR", "Invalid CSRF token");
    const parsed = createApplicationInputSchema.safeParse(body);
    if (!parsed.success) return validationError(set, parsed.error);
    const application = await applications.create(context.userId, parsed.data);
    const response: ApplicationResponse = { data: { application } };
    set.status = 201;
    return response;
  });
}
