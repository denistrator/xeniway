import type { ApplicationEvent, ApplicationResponse, JobApplication } from "@xeniway/shared";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { createDependencies, jsonRequest, register } from "./app-test-support";

describe("application API", () => {
  it("returns activity in application detail and supports owned manual event CRUD", async () => {
    const app = createApp(createDependencies());
    const owner = await register(app, "activity-owner@example.com");
    const other = await register(app, "activity-other@example.com");
    const created = await app.handle(
      jsonRequest(
        "http://localhost/api/applications",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ company: "Acme", position: "Engineer" }),
        },
        owner.sessionId,
        owner.payload.data.csrfToken,
      ),
    );
    const applicationId = ((await created.json()) as ApplicationResponse).data.application.id;
    const legacyDetail = await app.handle(
      jsonRequest(
        `http://localhost/api/applications/${applicationId}`,
        {},
        owner.sessionId,
        owner.payload.data.csrfToken,
      ),
    );
    expect(((await legacyDetail.json()) as { data: { events: ApplicationEvent[] } }).data.events).toMatchObject([
      { type: "application_created", isSystem: true },
    ]);
    const url = `http://localhost/api/applications/${applicationId}/events`;
    const input = { type: "follow_up", title: "Send a note", occurredAt: "2026-09-01T12:00:00+00:00" };
    const forbidden = await app.handle(
      jsonRequest(url, { method: "POST", body: JSON.stringify(input) }, other.sessionId, other.payload.data.csrfToken),
    );
    expect(forbidden.status).toBe(404);
    const noCsrf = await app.handle(
      new Request(url, {
        method: "POST",
        headers: { cookie: `session_id=${owner.sessionId}`, "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
    expect(noCsrf.status).toBe(403);
    const invalid = await app.handle(
      jsonRequest(
        url,
        {
          method: "POST",
          body: JSON.stringify({ ...input, title: " " }),
          headers: { "content-type": "application/json" },
        },
        owner.sessionId,
        owner.payload.data.csrfToken,
      ),
    );
    expect(invalid.status).toBe(422);
    const response = await app.handle(
      jsonRequest(
        url,
        { method: "POST", body: JSON.stringify(input), headers: { "content-type": "application/json" } },
        owner.sessionId,
        owner.payload.data.csrfToken,
      ),
    );
    expect(response.status).toBe(201);
    const eventId = ((await response.json()) as { data: { event: ApplicationEvent } }).data.event.id;
    const crossUserUpdate = await app.handle(
      jsonRequest(
        `${url}/${eventId}`,
        { method: "PATCH", body: JSON.stringify({ title: "Stolen" }), headers: { "content-type": "application/json" } },
        other.sessionId,
        other.payload.data.csrfToken,
      ),
    );
    expect(crossUserUpdate.status).toBe(404);
    const detail = await app.handle(
      jsonRequest(
        `http://localhost/api/applications/${applicationId}`,
        {},
        owner.sessionId,
        owner.payload.data.csrfToken,
      ),
    );
    expect(((await detail.json()) as { data: { events: ApplicationEvent[] } }).data.events).toContainEqual(
      expect.objectContaining({ id: eventId, title: "Send a note" }),
    );
    const updated = await app.handle(
      jsonRequest(
        `${url}/${eventId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ title: "Sent the note" }),
          headers: { "content-type": "application/json" },
        },
        owner.sessionId,
        owner.payload.data.csrfToken,
      ),
    );
    expect(((await updated.json()) as { data: { event: ApplicationEvent } }).data.event.title).toBe("Sent the note");
    const deleted = await app.handle(
      jsonRequest(`${url}/${eventId}`, { method: "DELETE" }, owner.sessionId, owner.payload.data.csrfToken),
    );
    expect(deleted.status).toBe(200);
  });

  it("rejects unauthenticated application access", async () => {
    const response = await createApp(createDependencies()).handle(new Request("http://localhost/api/applications"));
    expect(response.status).toBe(401);
  });

  it("reorders owned applications within a status", async () => {
    const app = createApp(createDependencies());
    const account = await register(app, "candidate@example.com");
    const ids: number[] = [];
    for (const company of ["First", "Second"]) {
      const response = await app.handle(
        jsonRequest(
          "http://localhost/api/applications",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ company, position: "Engineer", status: "saved" }),
          },
          account.sessionId,
          account.payload.data.csrfToken,
        ),
      );
      ids.push(((await response.json()) as ApplicationResponse).data.application.id);
    }
    const otherStatusResponse = await app.handle(
      jsonRequest(
        "http://localhost/api/applications",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ company: "Other status", position: "Engineer", status: "applied" }),
        },
        account.sessionId,
        account.payload.data.csrfToken,
      ),
    );
    const otherStatusId = ((await otherStatusResponse.json()) as ApplicationResponse).data.application.id;

    const response = await app.handle(
      jsonRequest(
        "http://localhost/api/applications/reorder",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "saved", applicationIds: [ids[1], ids[0]] }),
        },
        account.sessionId,
        account.payload.data.csrfToken,
      ),
    );
    expect(response.status).toBe(200);
    const reorderedApplications = ((await response.json()) as { data: { applications: JobApplication[] } }).data
      .applications;
    expect(reorderedApplications.map((job) => job.id)).toEqual(expect.arrayContaining([...ids, otherStatusId]));
    expect(reorderedApplications.findIndex((job) => job.id === ids[1])).toBeLessThan(
      reorderedApplications.findIndex((job) => job.id === ids[0]),
    );
  });

  it("supports all statuses, filtering, updates, archive, restore, and deletion", async () => {
    const app = createApp(createDependencies());
    const account = await register(app, "candidate@example.com");
    const statuses = ["saved", "applied", "interview", "offer", "rejected", "withdrawn"] as const;
    const created: JobApplication[] = [];

    for (const status of statuses) {
      const response = await app.handle(
        jsonRequest(
          "http://localhost/api/applications",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ company: `Company ${status}`, position: "Engineer", status }),
          },
          account.sessionId,
          account.payload.data.csrfToken,
        ),
      );
      expect(response.status).toBe(201);
      created.push(((await response.json()) as ApplicationResponse).data.application);
    }

    const filtered = await app.handle(
      jsonRequest(
        "http://localhost/api/applications?status=offer",
        {},
        account.sessionId,
        account.payload.data.csrfToken,
      ),
    );
    expect(((await filtered.json()) as { data: { applications: JobApplication[] } }).data.applications).toHaveLength(1);

    const updated = await app.handle(
      jsonRequest(
        `http://localhost/api/applications/${created[0].id}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ notes: "Follow up tomorrow", status: "applied" }),
        },
        account.sessionId,
        account.payload.data.csrfToken,
      ),
    );
    expect(((await updated.json()) as ApplicationResponse).data.application.notes).toBe("Follow up tomorrow");

    const archive = await app.handle(
      jsonRequest(
        `http://localhost/api/applications/${created[0].id}/archive`,
        {
          method: "POST",
        },
        account.sessionId,
        account.payload.data.csrfToken,
      ),
    );
    expect(archive.status).toBe(200);
    const activeAfterArchive = await app.handle(
      jsonRequest("http://localhost/api/applications", {}, account.sessionId, account.payload.data.csrfToken),
    );
    expect(
      ((await activeAfterArchive.json()) as { data: { applications: JobApplication[] } }).data.applications,
    ).toHaveLength(5);
    const activeDeletion = await app.handle(
      jsonRequest(
        `http://localhost/api/applications/${created[1].id}`,
        { method: "DELETE" },
        account.sessionId,
        account.payload.data.csrfToken,
      ),
    );
    expect(activeDeletion.status).toBe(200);
    const archived = await app.handle(
      jsonRequest("http://localhost/api/applications/archive", {}, account.sessionId, account.payload.data.csrfToken),
    );
    expect(((await archived.json()) as { data: { applications: JobApplication[] } }).data.applications).toHaveLength(1);

    const restore = await app.handle(
      jsonRequest(
        `http://localhost/api/applications/${created[0].id}/restore`,
        {
          method: "POST",
        },
        account.sessionId,
        account.payload.data.csrfToken,
      ),
    );
    expect(restore.status).toBe(200);
    await app.handle(
      jsonRequest(
        `http://localhost/api/applications/${created[0].id}/archive`,
        {
          method: "POST",
        },
        account.sessionId,
        account.payload.data.csrfToken,
      ),
    );
    const deletion = await app.handle(
      jsonRequest(
        `http://localhost/api/applications/${created[0].id}`,
        {
          method: "DELETE",
        },
        account.sessionId,
        account.payload.data.csrfToken,
      ),
    );
    expect(deletion.status).toBe(200);
    expect(
      (
        (await (
          await app.handle(
            jsonRequest(
              "http://localhost/api/applications/archive",
              {},
              account.sessionId,
              account.payload.data.csrfToken,
            ),
          )
        ).json()) as { data: { applications: JobApplication[] } }
      ).data.applications,
    ).toHaveLength(0);
  });

  it("isolates applications between authenticated users", async () => {
    const app = createApp(createDependencies());
    const first = await register(app, "first@example.com");
    const createResponse = await app.handle(
      jsonRequest(
        "http://localhost/api/applications",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ company: "Private Co", position: "Engineer", status: "saved" }),
        },
        first.sessionId,
        first.payload.data.csrfToken,
      ),
    );
    const application = ((await createResponse.json()) as ApplicationResponse).data.application;
    const second = await register(app, "second@example.com");
    expect(second.payload.data.user.id).toBe(2);

    const list = await app.handle(
      jsonRequest("http://localhost/api/applications", {}, second.sessionId, second.payload.data.csrfToken),
    );
    expect(((await list.json()) as { data: { applications: JobApplication[] } }).data.applications).toHaveLength(0);
    const read = await app.handle(
      jsonRequest(
        `http://localhost/api/applications/${application.id}`,
        {},
        second.sessionId,
        second.payload.data.csrfToken,
      ),
    );
    expect(read.status).toBe(404);
    const archive = await app.handle(
      jsonRequest(
        `http://localhost/api/applications/${application.id}/archive`,
        { method: "POST" },
        second.sessionId,
        second.payload.data.csrfToken,
      ),
    );
    expect(archive.status).toBe(404);
  });

  it("returns a stable error envelope when persistence fails", async () => {
    const dependencies = createDependencies();
    const originalApplications = dependencies.applications;
    dependencies.applications = {
      ...originalApplications,
      async list() {
        throw new Error("database unavailable");
      },
    };
    const app = createApp(dependencies);
    const account = await register(app, "candidate@example.com");

    const response = await app.handle(
      jsonRequest("http://localhost/api/applications", {}, account.sessionId, account.payload.data.csrfToken),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  });

  it("blacklists and restores an owned application with an optional reason", async () => {
    const app = createApp(createDependencies());
    const account = await register(app, "candidate@example.com");
    const created = await app.handle(
      jsonRequest(
        "http://localhost/api/applications",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ company: "Blocked Co", position: "Engineer", status: "saved" }),
        },
        account.sessionId,
        account.payload.data.csrfToken,
      ),
    );
    const application = ((await created.json()) as ApplicationResponse).data.application;

    const blacklist = await app.handle(
      jsonRequest(
        `http://localhost/api/applications/${application.id}/blacklist`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: "Duplicate employer" }),
        },
        account.sessionId,
        account.payload.data.csrfToken,
      ),
    );
    expect(blacklist.status).toBe(200);

    const active = await app.handle(
      jsonRequest("http://localhost/api/applications", {}, account.sessionId, account.payload.data.csrfToken),
    );
    expect(((await active.json()) as { data: { applications: JobApplication[] } }).data.applications).toHaveLength(0);

    const blacklisted = await app.handle(
      jsonRequest("http://localhost/api/applications/blacklist", {}, account.sessionId, account.payload.data.csrfToken),
    );
    const blacklistedApplications = ((await blacklisted.json()) as { data: { applications: JobApplication[] } }).data
      .applications;
    expect(blacklistedApplications).toHaveLength(1);
    expect(blacklistedApplications[0]).toMatchObject({ id: application.id, blacklistReason: "Duplicate employer" });

    const unblacklist = await app.handle(
      jsonRequest(
        `http://localhost/api/applications/${application.id}/unblacklist`,
        { method: "POST" },
        account.sessionId,
        account.payload.data.csrfToken,
      ),
    );
    expect(unblacklist.status).toBe(200);
    const activeAfterRestore = await app.handle(
      jsonRequest("http://localhost/api/applications", {}, account.sessionId, account.payload.data.csrfToken),
    );
    expect(
      ((await activeAfterRestore.json()) as { data: { applications: JobApplication[] } }).data.applications,
    ).toHaveLength(1);
  });
});
