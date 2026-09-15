import type { ApplicationDetailResponse, ApplicationEvent } from "@xeniway/shared";
import { Elysia } from "elysia";
import { errorResponse, errorResponseWithStatus, parseId, requireAuth } from "./support";
import type { RouteDependencies } from "./types";

export function applicationDetailRoute({ applications, auth }: RouteDependencies) {
  return new Elysia().get("/api/applications/:id", async ({ params, request, set }) => {
    const context = await requireAuth(auth, set, request);
    if (!context) return errorResponseWithStatus(set, 401, "UNAUTHENTICATED", "Unauthenticated");
    const id = parseId(params.id, set);
    if (id === null) return errorResponse("INVALID_ID", "Application id must be a positive integer");
    const application = await applications.findById(context.userId, id, { anyState: true });
    if (!application) return errorResponseWithStatus(set, 404, "NOT_FOUND", "Application not found");
    const events = await applications.listEvents(context.userId, id);
    if (!events.some((event) => event.type === "application_created")) {
      // Pre-feature applications have no persisted creation event; derive the marker from their audit timestamp.
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
  });
}
