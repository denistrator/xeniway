import {
  type ApplicationListResponse,
  blacklistInputSchema,
  type MessageResponse,
  removeAllApplicationsInputSchema,
  reorderApplicationsInputSchema,
} from "@xeniway/shared";
import { Elysia } from "elysia";
import { errorResponse, errorResponseWithStatus, parseId, validationError } from "../support";
import { requireAuthenticatedMutation } from "../support/auth-guard";
import type { ApplicationRouteDependencies } from "../types";

export function applicationBoardRoutes({ applications, auth }: ApplicationRouteDependencies) {
  return new Elysia()
    .post("/api/applications/:id/archive", async ({ params, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const id = parseId(params.id, set);
      if (id === null) return errorResponse("INVALID_ID", "Application id must be a positive integer");
      if (!(await applications.archive(authorization.context.userId, id)))
        return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application not found or already archived");
      const response: MessageResponse = { data: { message: "Application archived" } };
      return response;
    })
    .post("/api/applications/:id/blacklist", async ({ body, params, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const id = parseId(params.id, set);
      if (id === null) return errorResponse("INVALID_ID", "Application id must be a positive integer");
      const parsed = blacklistInputSchema.safeParse(body);
      if (!parsed.success) return validationError(set, parsed.error);
      if (!(await applications.blacklist(authorization.context.userId, id, parsed.data.reason ?? null)))
        return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application not found or not active");
      const response: MessageResponse = { data: { message: "Application blacklisted" } };
      return response;
    })
    .post("/api/applications/:id/unblacklist", async ({ params, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const id = parseId(params.id, set);
      if (id === null) return errorResponse("INVALID_ID", "Application id must be a positive integer");
      if (!(await applications.unblacklist(authorization.context.userId, id)))
        return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application is not blacklisted");
      const response: MessageResponse = { data: { message: "Application removed from blacklist" } };
      return response;
    })
    .post("/api/applications/:id/restore", async ({ params, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const id = parseId(params.id, set);
      if (id === null) return errorResponse("INVALID_ID", "Application id must be a positive integer");
      if (!(await applications.restore(authorization.context.userId, id)))
        return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application not found or not archived");
      const response: MessageResponse = { data: { message: "Application restored" } };
      return response;
    })
    .post("/api/applications/reorder", async ({ body, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const parsed = reorderApplicationsInputSchema.safeParse(body);
      if (!parsed.success) return validationError(set, parsed.error);
      if (!(await applications.reorder(authorization.context.userId, parsed.data.status, parsed.data.applicationIds)))
        return errorResponseWithStatus(set, 400, "INVALID_ORDER", "Application order is invalid");
      const records = await applications.list(authorization.context.userId);
      const response: ApplicationListResponse = { data: { applications: records } };
      return response;
    })
    .post("/api/applications/remove-all", async ({ body, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const input = removeAllApplicationsInputSchema.safeParse(body);
      if (!input.success) return validationError(set, input.error);
      const count = await applications.removeAll(authorization.context.userId, input.data.board);
      const response: MessageResponse = { data: { message: `${count} applications deleted` } };
      return response;
    });
}
