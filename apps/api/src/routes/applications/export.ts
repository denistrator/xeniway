import { Elysia } from "elysia";
import { requireAuthenticatedUser } from "../support/auth-guard";
import type { ApplicationRouteDependencies } from "../types";
import { serializeApplicationsCsv } from "./export-csv";

export function applicationExportRoutes({ applications, auth }: ApplicationRouteDependencies) {
  return new Elysia().get("/api/applications/export.csv", async ({ request, set }) => {
    const authorization = await requireAuthenticatedUser(auth, set, request);
    if (!authorization.ok) return authorization.response;

    set.headers["content-type"] = "text/csv; charset=utf-8";
    set.headers["content-disposition"] =
      `attachment; filename="xenia-way-export-${new Date().toISOString().slice(0, 10)}.csv"`;
    set.headers["cache-control"] = "private, no-store";
    set.headers["x-content-type-options"] = "nosniff";

    const records = await applications.listForExport(authorization.context.userId);
    return serializeApplicationsCsv(records);
  });
}
