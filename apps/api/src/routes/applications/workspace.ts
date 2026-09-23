import {
  type ApplicationContactResponse,
  type ApplicationFollowUpTaskResponse,
  type ApplicationPreparationResponse,
  createApplicationContactInputSchema,
  createApplicationFollowUpTaskInputSchema,
  type MessageResponse,
  updateApplicationContactInputSchema,
  updateApplicationFollowUpTaskInputSchema,
  updateApplicationPreparationInputSchema,
} from "@xeniway/shared";
import { Elysia } from "elysia";
import { errorResponse, errorResponseWithStatus, parseId, validationError } from "../support";
import { requireAuthenticatedMutation } from "../support/auth-guard";
import type { ApplicationRouteDependencies } from "../types";

export function applicationWorkspaceRoutes({ applications, auth }: ApplicationRouteDependencies) {
  return new Elysia()
    .put("/api/applications/:id/preparation", async ({ body, params, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const { userId } = authorization.context;
      const id = parseId(params.id, set);
      if (id === null) return errorResponse("INVALID_ID", "Application id must be a positive integer");
      const parsed = updateApplicationPreparationInputSchema.safeParse(body);
      if (!parsed.success) return validationError(set, parsed.error);
      const preparation = await applications.updatePreparation(userId, id, parsed.data);
      if (!preparation) return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application not found");
      const response: ApplicationPreparationResponse = { data: { preparation } };
      return response;
    })
    .post("/api/applications/:id/contacts", async ({ body, params, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const { userId } = authorization.context;
      const id = parseId(params.id, set);
      if (id === null) return errorResponse("INVALID_ID", "Application id must be a positive integer");
      const parsed = createApplicationContactInputSchema.safeParse(body);
      if (!parsed.success) return validationError(set, parsed.error);
      const contact = await applications.createContact(userId, id, parsed.data);
      if (!contact) return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application not found");
      set.status = 201;
      const response: ApplicationContactResponse = { data: { contact } };
      return response;
    })
    .patch("/api/applications/:id/contacts/:contactId", async ({ body, params, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const { userId } = authorization.context;
      const id = parseId(params.id, set);
      const contactId = parseId(params.contactId, set);
      if (id === null || contactId === null)
        return errorResponse("INVALID_ID", "Application and contact ids must be positive integers");
      const parsed = updateApplicationContactInputSchema.safeParse(body);
      if (!parsed.success) return validationError(set, parsed.error);
      const contact = await applications.updateContact(userId, id, contactId, parsed.data);
      if (!contact) return errorResponseWithStatus(set, 404, "NOT_FOUND", "Contact not found");
      const response: ApplicationContactResponse = { data: { contact } };
      return response;
    })
    .delete("/api/applications/:id/contacts/:contactId", async ({ params, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const { userId } = authorization.context;
      const id = parseId(params.id, set);
      const contactId = parseId(params.contactId, set);
      if (id === null || contactId === null)
        return errorResponse("INVALID_ID", "Application and contact ids must be positive integers");
      if (!(await applications.deleteContact(userId, id, contactId)))
        return errorResponseWithStatus(set, 404, "NOT_FOUND", "Contact not found");
      const response: MessageResponse = { data: { message: "Contact deleted" } };
      return response;
    })
    .post("/api/applications/:id/follow-ups", async ({ body, params, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const { userId } = authorization.context;
      const id = parseId(params.id, set);
      if (id === null) return errorResponse("INVALID_ID", "Application id must be a positive integer");
      const parsed = createApplicationFollowUpTaskInputSchema.safeParse(body);
      if (!parsed.success) return validationError(set, parsed.error);
      const followUpTask = await applications.createFollowUpTask(userId, id, parsed.data);
      if (!followUpTask) return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application not found");
      set.status = 201;
      const response: ApplicationFollowUpTaskResponse = { data: { followUpTask } };
      return response;
    })
    .patch("/api/applications/:id/follow-ups/:taskId", async ({ body, params, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const { userId } = authorization.context;
      const id = parseId(params.id, set);
      const taskId = parseId(params.taskId, set);
      if (id === null || taskId === null)
        return errorResponse("INVALID_ID", "Application and task ids must be positive integers");
      const parsed = updateApplicationFollowUpTaskInputSchema.safeParse(body);
      if (!parsed.success) return validationError(set, parsed.error);
      const followUpTask = await applications.updateFollowUpTask(userId, id, taskId, parsed.data);
      if (!followUpTask) return errorResponseWithStatus(set, 404, "NOT_FOUND", "Follow-up not found");
      const response: ApplicationFollowUpTaskResponse = { data: { followUpTask } };
      return response;
    })
    .post("/api/applications/:id/follow-ups/:taskId/complete", async ({ body, params, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const { userId } = authorization.context;
      const id = parseId(params.id, set);
      const taskId = parseId(params.taskId, set);
      if (id === null || taskId === null)
        return errorResponse("INVALID_ID", "Application and task ids must be positive integers");
      if (body !== undefined)
        return validationError(set, { issues: [{ path: ["form"], message: "Completion takes no body" }] });
      const followUpTask = await applications.completeFollowUpTask(userId, id, taskId);
      if (!followUpTask) return errorResponseWithStatus(set, 404, "NOT_FOUND", "Follow-up not found");
      const response: ApplicationFollowUpTaskResponse = { data: { followUpTask } };
      return response;
    })
    .delete("/api/applications/:id/follow-ups/:taskId", async ({ params, request, set }) => {
      const authorization = await requireAuthenticatedMutation(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const { userId } = authorization.context;
      const id = parseId(params.id, set);
      const taskId = parseId(params.taskId, set);
      if (id === null || taskId === null)
        return errorResponse("INVALID_ID", "Application and task ids must be positive integers");
      if (!(await applications.deleteFollowUpTask(userId, id, taskId)))
        return errorResponseWithStatus(set, 404, "NOT_FOUND", "Follow-up not found");
      const response: MessageResponse = { data: { message: "Follow-up deleted" } };
      return response;
    });
}
