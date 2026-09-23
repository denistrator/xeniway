import { type ApplicationListResponse, statusFilterSchema } from "@xeniway/shared";
import { Elysia } from "elysia";
import { validationError } from "../support";
import { requireAuthenticatedUser } from "../support/auth-guard";
import type { ApplicationRouteDependencies } from "../types";

export function applicationCollectionRoutes({ applications, auth }: ApplicationRouteDependencies) {
  return new Elysia()
    .get("/api/applications", async ({ query, request, set }) => {
      const authorization = await requireAuthenticatedUser(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const status = statusFilterSchema.safeParse(query.status || undefined);
      if (!status.success) return validationError(set, status.error);
      const records = await applications.list(authorization.context.userId, { status: status.data });
      const response: ApplicationListResponse = { data: { applications: records } };
      return response;
    })
    .get("/api/applications/archive", async ({ request, set }) => {
      const authorization = await requireAuthenticatedUser(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const records = await applications.list(authorization.context.userId, { archived: true });
      const response: ApplicationListResponse = { data: { applications: records } };
      return response;
    })
    .get("/api/applications/blacklist", async ({ request, set }) => {
      const authorization = await requireAuthenticatedUser(auth, set, request);
      if (!authorization.ok) return authorization.response;
      const records = await applications.listBlacklisted(authorization.context.userId);
      const response: ApplicationListResponse = { data: { applications: records } };
      return response;
    });
}
