import {
  type ApplicationDetailResponse,
  type ApplicationEvent,
  type ApplicationResponse,
  createApplicationInputSchema,
  type MessageResponse,
  updateApplicationInputSchema,
} from "@xeniway/shared";
import { Elysia } from "elysia";
import { errorResponse, errorResponseWithStatus, parseId, validationError } from "../support";
import { requireAuthenticatedMutation, requireAuthenticatedUser } from "../support/auth-guard";
import type { ApplicationRouteDependencies } from "../types";

export function applicationItemRoutes({ applications, auth }: ApplicationRouteDependencies) {
  return new Elysia()
    .get("/api/applications/:id", async ({ params, request, set }) => {
      const authorization = await requireAuthenticatedUser(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const { userId } = authorization.context;
      const id = parseId(params.id, set);
      if (id === null) return errorResponse("INVALID_ID", "Application id must be a positive integer");
      const application = await applications.findById(userId, id, { anyState: true });
      if (!application) return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application not found");
      const events = await applications.listEvents(userId, id);
      if (!events.some((event) => event.type === "application_created")) {
        const creationMarker: ApplicationEvent = {
          id: -application.id,
          applicationId: application.id,
          type: "application_created",
          title: "application created",
          description: null,
          occurredAt: application.createdAt,
          createdAt: application.createdAt,
          updatedAt: application.createdAt,
          metadata: null,
          isSystem: true,
        };
        events.push(creationMarker);
        events.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || right.id - left.id);
      }
      const response: ApplicationDetailResponse = { data: { application, events } };
      return response;
    })
    .post("/api/applications", async ({ body, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const parsed = createApplicationInputSchema.safeParse(body);
      if (!parsed.success) return validationError(set, parsed.error);
      const application = await applications.create(authorization.context.userId, parsed.data);
      const response: ApplicationResponse = { data: { application } };
      set.status = 201;
      return response;
    })
    .put("/api/applications/:id", async ({ body, params, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const id = parseId(params.id, set);
      if (id === null) return errorResponse("INVALID_ID", "Application id must be a positive integer");
      const parsed = updateApplicationInputSchema.safeParse(body);
      if (!parsed.success) return validationError(set, parsed.error);
      const application = await applications.update(authorization.context.userId, id, parsed.data);
      if (!application) return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application not found");
      const response: ApplicationResponse = { data: { application } };
      return response;
    })
    .delete("/api/applications/:id", async ({ params, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const id = parseId(params.id, set);
      if (id === null) return errorResponse("INVALID_ID", "Application id must be a positive integer");
      if (!(await applications.permanentDelete(authorization.context.userId, id)))
        return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application not found");
      const response: MessageResponse = { data: { message: "Application deleted" } };
      return response;
    });
}
