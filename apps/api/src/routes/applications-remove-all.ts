import { type MessageResponse, removeAllApplicationsInputSchema } from "@xeniway/shared";
import { Elysia } from "elysia";
import { errorResponseWithStatus, requireAuth, validationError, verifyRequestCsrf } from "./support";
import type { RouteDependencies } from "./types";

export function applicationsRemoveAllRoute({ applications, auth }: RouteDependencies) {
  return new Elysia().post("/api/applications/remove-all", async ({ body, request, set }) => {
    const context = await requireAuth(auth, set, request);
    if (!context) return errorResponseWithStatus(set, 401, "UNAUTHENTICATED", "Unauthenticated");
    if (!(await verifyRequestCsrf(auth, set, request)))
      return errorResponseWithStatus(set, 403, "CSRF_ERROR", "Invalid CSRF token");
    const input = removeAllApplicationsInputSchema.safeParse(body);
    if (!input.success) return validationError(set, input.error);
    const count = await applications.removeAll(context.userId, input.data.board);
    const response: MessageResponse = { data: { message: `${count} applications deleted` } };
    return response;
  });
}
