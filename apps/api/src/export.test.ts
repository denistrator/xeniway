import { describe, expect, it, vi } from "vitest";
import {
  applicationHeaders,
  contactHeaders,
  csvRecords,
  csvRows,
  exportFiles,
  followUpHeaders,
} from "../../../tests/support/export";
import { createApp } from "./app";
import { createDependencies, register } from "./app-test-support";
import type { ApplicationRepository } from "./db/repositories/types";

function exportRequest(path: string, sessionId?: string) {
  return new Request(`http://localhost/api/applications/${path}`, {
    headers: sessionId ? { cookie: `session_id=${sessionId}` } : {},
  });
}

async function seedAccountApplications(repository: ApplicationRepository, userId: number, prefix: string) {
  for (const board of ["active", "archive", "blacklist"] as const) {
    const application = await repository.create(userId, {
      company: `${prefix} ${board}`,
      position: "Engineer",
      status: "saved",
      salary: "SECRET SALARY",
    });
    await repository.updatePreparation(userId, application.id, { companyResearch: `${prefix} research` });
    await repository.createContact(userId, application.id, { name: `${prefix} contact ${board}`, role: "Recruiter" });
    await repository.createFollowUpTask(userId, application.id, {
      title: `${prefix} task ${board}`,
      dueDate: "2026-10-03",
    });
    switch (board) {
      case "archive": {
        await repository.archive(userId, application.id);
        break;
      }
      case "blacklist": {
        await repository.blacklist(userId, application.id, "Private blacklist reason");
        break;
      }
      case "active": {
        break;
      }
    }
  }
}

describe("export endpoints", () => {
  it("exports blank preparation cells when no workspace has been saved", async () => {
    const dependencies = createDependencies();
    const app = createApp(dependencies);
    const owner = await register(app, "default-preparation-export@example.com");
    await dependencies.applications.create(owner.payload.data.user.id, {
      company: "No workspace",
      position: "Engineer",
      status: "saved",
    });
    const response = await app.handle(exportRequest("export.csv", owner.sessionId));
    expect(response.status).toBe(200);
    expect(csvRecords(await response.text())[0]).toMatchObject({
      "Company research": "",
      "Talking points": "",
      "Interviewer questions": "",
    });
  });

  it.each(["csv", "zip"])("does not produce a partial %s download on repository failure", async (format) => {
    const dependencies = createDependencies();
    const app = createApp(dependencies);
    const owner = await register(app, `failed-export-${format}@example.com`);
    vi.spyOn(dependencies.applications, "listForExport").mockRejectedValue(new Error("Private storage detail"));
    const response = await app.handle(exportRequest(`export.${format}`, owner.sessionId));
    expect(response.status).toBe(500);
    const body = await response.text();
    expect(JSON.parse(body)).toMatchObject({ error: { code: "INTERNAL_ERROR" } });
    expect(body).not.toContain("Private storage detail");
  });

  it.each(["csv", "zip"])(
    "rejects anonymous and invalid sessions for %s without reading private records",
    async (format) => {
      const dependencies = createDependencies();
      const reads = [
        vi.spyOn(dependencies.applications, "listForExport"),
        vi.spyOn(dependencies.applications, "listContactsForExport"),
        vi.spyOn(dependencies.applications, "listFollowUpTasksForExport"),
      ];
      const app = createApp(dependencies);
      for (const session of [undefined, "invalid-session"]) {
        const response = await app.handle(exportRequest(`export.${format}`, session));
        expect(response.status).toBe(401);
        expect(await response.json()).toMatchObject({ error: { code: "UNAUTHENTICATED" } });
      }
      for (const read of reads) {
        expect(read).not.toHaveBeenCalled();
      }
    },
  );

  it("exports exactly the owner's records from every board and related file", async () => {
    const dependencies = createDependencies();
    const app = createApp(dependencies);
    const owner = await register(app, "export-owner@example.com");
    const other = await register(app, "export-other@example.com");
    const ownerId = owner.payload.data.user.id;
    await seedAccountApplications(dependencies.applications, ownerId, "Owner");
    await seedAccountApplications(dependencies.applications, other.payload.data.user.id, "Other");
    const response = await app.handle(exportRequest("export.zip?userId=2", owner.sessionId));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="xenia-way-export-\d{4}-\d{2}-\d{2}\.zip"$/,
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    const files = exportFiles(new Uint8Array(await response.arrayBuffer()));
    expect(Object.keys(files).sort()).toEqual(["applications.csv", "contacts.csv", "follow-ups.csv"]);
    const applications = csvRecords(files["applications.csv"]);
    expect(applications.map((row) => [row.Company, row.Board, row["Company research"]])).toEqual([
      ["Owner active", "active", "Owner research"],
      ["Owner archive", "archive", "Owner research"],
      ["Owner blacklist", "blacklist", "Owner research"],
    ]);
    expect(csvRows(files["applications.csv"])[0]).toEqual(applicationHeaders);
    expect(csvRows(files["contacts.csv"])[0]).toEqual(contactHeaders);
    expect(csvRows(files["follow-ups.csv"])[0]).toEqual(followUpHeaders);
    expect(csvRecords(files["contacts.csv"]).map((row) => row.Name)).toEqual([
      "Owner contact active",
      "Owner contact archive",
      "Owner contact blacklist",
    ]);
    expect(csvRecords(files["follow-ups.csv"]).map((row) => row.Title)).toEqual([
      "Owner task active",
      "Owner task archive",
      "Owner task blacklist",
    ]);
    for (const csv of Object.values(files)) {
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      for (const secret of [
        "Other",
        "SECRET SALARY",
        "Private blacklist reason",
        owner.sessionId,
        owner.payload.data.csrfToken,
        "export-owner@example.com",
      ]) {
        expect(csv).not.toContain(secret);
      }
    }
    const csvResponse = await app.handle(exportRequest("export.csv", owner.sessionId));
    expect(csvResponse.status).toBe(200);
    expect(csvResponse.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(csvResponse.headers.get("cache-control")).toBe("private, no-store");
    expect(csvResponse.headers.get("x-content-type-options")).toBe("nosniff");
    expect(csvResponse.headers.get("content-disposition")).toMatch(/\.csv"$/);
    const csvText = new TextDecoder("utf-8", { ignoreBOM: true }).decode(await csvResponse.arrayBuffer());
    expect(csvText).toBe(files["applications.csv"]);
  });

  it("returns a valid empty package and header-only standalone CSV", async () => {
    const app = createApp(createDependencies());
    const owner = await register(app, "empty-export@example.com");
    const response = await app.handle(exportRequest("export.zip", owner.sessionId));
    expect(response.status).toBe(200);
    const files = exportFiles(new Uint8Array(await response.arrayBuffer()));
    expect(Object.keys(files).sort()).toEqual(["applications.csv", "contacts.csv", "follow-ups.csv"]);
    for (const csv of Object.values(files)) {
      expect(csvRecords(csv)).toEqual([]);
      expect(csvRows(csv)).toHaveLength(1);
    }
    const csv = await app.handle(exportRequest("export.csv", owner.sessionId));
    expect(csvRows(await csv.text())).toEqual([applicationHeaders]);
  });
});
