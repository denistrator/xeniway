import {
  type ApplicationEventResponse,
  applicationEventInputSchema,
  type MessageResponse,
  updateApplicationEventInputSchema,
} from "@xeniway/shared";
import { Elysia } from "elysia";
import { errorResponse, errorResponseWithStatus, parseId, validationError } from "../support";
import { requireAuthenticatedMutation } from "../support/auth-guard";
import type { ApplicationRouteDependencies } from "../types";

export function applicationEventRoutes({ applications, auth }: ApplicationRouteDependencies) {
  return new Elysia()
    .post("/api/applications/:id/events", async ({ body, params, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const { userId } = authorization.context;
      const id = parseId(params.id, set);
      if (id === null) return errorResponse("INVALID_ID", "Application id must be a positive integer");
      if (!(await applications.findById(userId, id, { anyState: true })))
        return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application not found");
      const parsed = applicationEventInputSchema.safeParse(body);
      if (!parsed.success) return validationError(set, parsed.error);
      const event = await applications.createEvent(userId, id, parsed.data);
      if (!event) return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application not found");
      set.status = 201;
      const response: ApplicationEventResponse = { data: { event } };
      return response;
    })
    .patch("/api/applications/:id/events/:eventId", async ({ body, params, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const { userId } = authorization.context;
      const id = parseId(params.id, set);
      const eventId = parseId(params.eventId, set);
      if (id === null || eventId === null)
        return errorResponse("INVALID_ID", "Application and event ids must be positive integers");
      if (!(await applications.findById(userId, id, { anyState: true })))
        return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application not found");
      const parsed = updateApplicationEventInputSchema.safeParse(body);
      if (!parsed.success) return validationError(set, parsed.error);
      const event = await applications.updateEvent(userId, id, eventId, parsed.data);
      if (!event) return errorResponseWithStatus(set, 404, "NOT_FOUND", "Event not found");
      const response: ApplicationEventResponse = { data: { event } };
      return response;
    })
    .delete("/api/applications/:id/events/:eventId", async ({ params, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const { userId } = authorization.context;
      const id = parseId(params.id, set);
      const eventId = parseId(params.eventId, set);
      if (id === null || eventId === null)
        return errorResponse("INVALID_ID", "Application and event ids must be positive integers");
      if (!(await applications.findById(userId, id, { anyState: true })))
        return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application not found");
      if (!(await applications.deleteEvent(userId, id, eventId)))
        return errorResponseWithStatus(set, 404, "NOT_FOUND", "Event not found");
      const response: MessageResponse = { data: { message: "Event deleted" } };
      return response;
    });
}
