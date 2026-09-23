import type {
  ApplicationContactResponse,
  ApplicationDetailResponse,
  ApplicationEvent,
  ApplicationFollowUpTask,
  ApplicationFollowUpTaskResponse,
  ApplicationPreparationResponse,
  ApplicationResponse,
  JobApplication,
} from "@xeniway/shared";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { createDependencies, jsonRequest, register } from "./app-test-support";

describe("application API", () => {
  it("exports every owned board and its activity as a downloadable CSV", async () => {
    const app = createApp(createDependencies());
    const owner = await register(app, "csv-owner@example.com");
    const other = await register(app, "csv-other@example.com");

    async function createApplication(email: string, company: string) {
      const account = email === owner.payload.data.user.email ? owner : other;
      const response = await app.handle(
        jsonRequest(
          "http://localhost/api/applications",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ company, position: "Engineer", location: "Remote", notes: "CSV note" }),
          },
          account.sessionId,
          account.payload.data.csrfToken,
        ),
      );
      return ((await response.json()) as ApplicationResponse).data.application.id;
    }

    const activeId = await createApplication(owner.payload.data.user.email, "CSV Active");
    const archivedId = await createApplication(owner.payload.data.user.email, "CSV Archived");
    const blacklistedId = await createApplication(owner.payload.data.user.email, "CSV Blacklisted");
    await createApplication(other.payload.data.user.email, "Other Account Secret");

    await app.handle(
      jsonRequest(
        `http://localhost/api/applications/${archivedId}/archive`,
        { method: "POST" },
        owner.sessionId,
        owner.payload.data.csrfToken,
      ),
    );
    await app.handle(
      jsonRequest(
        `http://localhost/api/applications/${blacklistedId}/blacklist`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: "Not a fit" }),
        },
        owner.sessionId,
        owner.payload.data.csrfToken,
      ),
    );
    await app.handle(
      jsonRequest(
        `http://localhost/api/applications/${activeId}/events`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "follow_up", title: "Email recruiter", occurredAt: "2026-09-02T09:00:00Z" }),
        },
        owner.sessionId,
        owner.payload.data.csrfToken,
      ),
    );

    const response = await app.handle(
      new Request("http://localhost/api/applications/export.csv", {
        headers: { cookie: `session_id=${owner.sessionId}` },
      }),
    );
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toMatch(/attachment; filename="xenia-way-export-.*\.csv"/);
    expect(csv).toContain("CSV Active");
    expect(csv).toContain("CSV Archived");
    expect(csv).toContain("CSV Blacklisted");
    expect(csv).toContain('"active"');
    expect(csv).toContain('"archive"');
    expect(csv).toContain('"blacklist"');
    expect(csv).toContain("Email recruiter");
    expect(csv).not.toContain("Other Account Secret");
  });

  it("requires authentication to export applications", async () => {
    const response = await createApp(createDependencies()).handle(
      new Request("http://localhost/api/applications/export.csv"),
    );

    expect(response.status).toBe(401);
  });

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

  it("does not leak deleted application activity into a newly created application", async () => {
    const app = createApp(createDependencies());
    const owner = await register(app, "activity-reuse@example.com");
    const createApplication = async (company: string) => {
      const response = await app.handle(
        jsonRequest(
          "http://localhost/api/applications",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ company, position: "Engineer" }),
          },
          owner.sessionId,
          owner.payload.data.csrfToken,
        ),
      );
      return ((await response.json()) as ApplicationResponse).data.application;
    };

    const deletedApplication = await createApplication("Deleted application");
    await app.handle(
      jsonRequest(
        `http://localhost/api/applications/${deletedApplication.id}/events`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type: "follow_up",
            title: "Private stale activity",
            occurredAt: "2026-09-01T12:00:00Z",
          }),
        },
        owner.sessionId,
        owner.payload.data.csrfToken,
      ),
    );
    await app.handle(
      jsonRequest(
        `http://localhost/api/applications/${deletedApplication.id}`,
        { method: "DELETE" },
        owner.sessionId,
        owner.payload.data.csrfToken,
      ),
    );

    const nextApplication = await createApplication("New application");
    const detail = await app.handle(
      jsonRequest(
        `http://localhost/api/applications/${nextApplication.id}`,
        {},
        owner.sessionId,
        owner.payload.data.csrfToken,
      ),
    );

    expect(nextApplication.id).not.toBe(deletedApplication.id);
    expect(((await detail.json()) as ApplicationDetailResponse).data.events).not.toContainEqual(
      expect.objectContaining({ title: "Private stale activity" }),
    );
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

describe("application workspace API", () => {
  async function fixture() {
    const app = createApp(createDependencies());
    const owner = await register(app, "workspace-owner@example.com");
    const other = await register(app, "workspace-other@example.com");
    async function create(company: string, account = owner) {
      const response = await app.handle(
        jsonRequest(
          "http://localhost/api/applications",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ company, position: "Engineer" }),
          },
          account.sessionId,
          account.payload.data.csrfToken,
        ),
      );
      expect(response.status).toBe(201);
      return ((await response.json()) as ApplicationResponse).data.application.id;
    }
    const id = await create("Workspace company");
    const secondId = await create("Second company");
    return { app, owner, other, id, secondId, create };
  }

  function request(
    app: ReturnType<typeof createApp>,
    account: Awaited<ReturnType<typeof register>>,
    path: string,
    method = "GET",
    body?: object,
    csrf = true,
  ) {
    const headers = new Headers({ cookie: `session_id=${account.sessionId}` });
    if (body !== undefined) headers.set("content-type", "application/json");
    if (csrf) headers.set("x-csrf-token", account.payload.data.csrfToken);
    return app.handle(
      new Request(`http://localhost/api/applications/${path}`, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      }),
    );
  }

  it("loads empty workspace sections from active, archive, and blacklist applications", async () => {
    const { app, owner, id, secondId } = await fixture();
    const response = await app.handle(
      jsonRequest(
        "http://localhost/api/applications",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ company: "Blacklisted company", position: "Engineer" }),
        },
        owner.sessionId,
        owner.payload.data.csrfToken,
      ),
    );
    const blacklistId = ((await response.json()) as ApplicationResponse).data.application.id;
    expect((await request(app, owner, `${secondId}/archive`, "POST")).status).toBe(200);
    expect((await request(app, owner, `${blacklistId}/blacklist`, "POST", { reason: "No fit" })).status).toBe(200);

    for (const applicationId of [id, secondId, blacklistId]) {
      const response = await request(app, owner, String(applicationId));
      expect(response.status).toBe(200);
      const { data } = (await response.json()) as ApplicationDetailResponse;
      expect(data.application.id).toBe(applicationId);
      expect(data.events).toBeInstanceOf(Array);
      expect(data.preparation).toEqual({
        companyResearch: null,
        talkingPoints: null,
        interviewerQuestions: null,
        updatedAt: null,
      });
      expect(data.contacts).toEqual([]);
      expect(data.followUpTasks).toEqual([]);
    }
    expect(
      (await request(app, owner, `${secondId}/preparation`, "PUT", { talkingPoints: "Archive notes" })).status,
    ).toBe(200);
    expect(
      (await request(app, owner, `${blacklistId}/contacts`, "POST", { name: "Mina", role: "Recruiter" })).status,
    ).toBe(201);
    expect(
      (await request(app, owner, `${blacklistId}/follow-ups`, "POST", { title: "Check later", dueDate: "2026-10-01" }))
        .status,
    ).toBe(201);
    const archived = (await (await request(app, owner, String(secondId))).json()) as ApplicationDetailResponse;
    const blacklisted = (await (await request(app, owner, String(blacklistId))).json()) as ApplicationDetailResponse;
    expect(archived.data.preparation.talkingPoints).toBe("Archive notes");
    expect(blacklisted.data.contacts[0].name).toBe("Mina");
    expect(blacklisted.data.followUpTasks[0].title).toBe("Check later");
  });

  it("updates preparation partially and supports contact and follow-up CRUD with completion", async () => {
    const { app, owner, id } = await fixture();
    const prep = await request(app, owner, `${id}/preparation`, "PUT", { companyResearch: "  Research  " });
    expect(prep.status).toBe(200);
    expect(((await prep.json()) as ApplicationPreparationResponse).data.preparation).toMatchObject({
      companyResearch: "Research",
      talkingPoints: null,
    });
    const cleared = await request(app, owner, `${id}/preparation`, "PUT", { companyResearch: null });
    expect(((await cleared.json()) as ApplicationPreparationResponse).data.preparation).toMatchObject({
      companyResearch: null,
    });

    const contactResponse = await request(app, owner, `${id}/contacts`, "POST", {
      name: "  Alex  ",
      role: "Recruiter",
      profileUrl: "https://example.com/alex",
    });
    expect(contactResponse.status).toBe(201);
    const contact = ((await contactResponse.json()) as ApplicationContactResponse).data.contact;
    expect(contact).toMatchObject({ applicationId: id, name: "Alex", email: null });
    expect(contact.createdAt).toBeTruthy();
    const editedContact = await request(app, owner, `${id}/contacts/${contact.id}`, "PATCH", {
      email: "alex@example.com",
    });
    expect(editedContact.status).toBe(200);
    expect(((await editedContact.json()) as ApplicationContactResponse).data.contact.email).toBe("alex@example.com");

    const taskResponse = await request(app, owner, `${id}/follow-ups`, "POST", {
      title: "  Email Alex  ",
      dueDate: "2026-10-03",
    });
    expect(taskResponse.status).toBe(201);
    const task = ((await taskResponse.json()) as ApplicationFollowUpTaskResponse).data.followUpTask;
    expect(task).toMatchObject({ applicationId: id, title: "Email Alex", completedAt: null });
    const changedTask = await request(app, owner, `${id}/follow-ups/${task.id}`, "PATCH", {
      notes: "Send portfolio",
    });
    expect(((await changedTask.json()) as ApplicationFollowUpTaskResponse).data.followUpTask.notes).toBe(
      "Send portfolio",
    );
    const completed = await request(app, owner, `${id}/follow-ups/${task.id}/complete`, "POST");
    expect(completed.status).toBe(200);
    const completedTask = ((await completed.json()) as ApplicationFollowUpTaskResponse).data.followUpTask;
    expect(completedTask.completedAt).toBeTruthy();
    const repeated = await request(app, owner, `${id}/follow-ups/${task.id}/complete`, "POST");
    expect(((await repeated.json()) as ApplicationFollowUpTaskResponse).data.followUpTask.completedAt).toBe(
      completedTask.completedAt,
    );
    const attemptedReopen = await request(app, owner, `${id}/follow-ups/${task.id}`, "PATCH", { completedAt: null });
    expect(attemptedReopen.status).toBe(422);
    const afterAttempt = (await (await request(app, owner, String(id))).json()) as ApplicationDetailResponse;
    expect(afterAttempt.data.followUpTasks[0].completedAt).toBe(completedTask.completedAt);
    const detail = (await (await request(app, owner, String(id))).json()) as ApplicationDetailResponse;
    expect(detail.data.contacts).toHaveLength(1);
    expect(detail.data.followUpTasks).toHaveLength(1);

    const deleteContact = await request(app, owner, `${id}/contacts/${contact.id}`, "DELETE");
    expect(deleteContact.status).toBe(200);
    expect(await deleteContact.json()).toEqual({ data: { message: "Contact deleted" } });
    const deleteTask = await request(app, owner, `${id}/follow-ups/${task.id}`, "DELETE");
    expect(deleteTask.status).toBe(200);
    expect(await deleteTask.json()).toEqual({ data: { message: "Follow-up deleted" } });
    const after = (await (await request(app, owner, String(id))).json()) as ApplicationDetailResponse;
    expect(after.data.contacts).toEqual([]);
    expect(after.data.followUpTasks).toEqual([]);
  });

  it("validates workspace input before looking up its application", async () => {
    const { app, owner } = await fixture();
    const response = await request(app, owner, "999999/preparation", "PUT", { unknownField: true });

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });

  it("orders contacts and incomplete tasks before completed tasks", async () => {
    const { app, owner, id } = await fixture();
    for (const name of ["First", "Second"]) {
      expect((await request(app, owner, `${id}/contacts`, "POST", { name, role: "Recruiter" })).status).toBe(201);
    }
    const tasks: ApplicationFollowUpTask[] = [];
    for (const [title, dueDate] of [
      ["Later", "2026-10-20"],
      ["Earlier", "2026-10-01"],
    ]) {
      const response = await request(app, owner, `${id}/follow-ups`, "POST", { title, dueDate });
      tasks.push(((await response.json()) as ApplicationFollowUpTaskResponse).data.followUpTask);
    }
    await request(app, owner, `${id}/follow-ups/${tasks[0].id}/complete`, "POST");
    const detail = (await (await request(app, owner, String(id))).json()) as ApplicationDetailResponse;
    expect(detail.data.contacts.map((contact) => contact.name)).toEqual(["First", "Second"]);
    expect(detail.data.followUpTasks.map((task) => task.title)).toEqual(["Earlier", "Later"]);
  });

  it("rejects missing authentication and CSRF for every workspace mutation", async () => {
    const { app, owner, id } = await fixture();
    const operations = [
      [`${id}/preparation`, "PUT", { companyResearch: "Private" }],
      [`${id}/contacts`, "POST", { name: "Alex", role: "Recruiter" }],
      [`${id}/contacts/1`, "PATCH", { name: "Alex" }],
      [`${id}/contacts/1`, "DELETE"],
      [`${id}/follow-ups`, "POST", { title: "Check in", dueDate: "2026-10-01" }],
      [`${id}/follow-ups/1`, "PATCH", { title: "Check in" }],
      [`${id}/follow-ups/1/complete`, "POST"],
      [`${id}/follow-ups/1`, "DELETE"],
    ] as const;
    const anonymous = await app.handle(new Request(`http://localhost/api/applications/${id}`));
    expect(anonymous.status).toBe(401);
    for (const [path, method, body] of operations) {
      const withoutCsrf = await request(app, owner, path, method, body, false);
      expect(withoutCsrf.status).toBe(403);
      expect((await withoutCsrf.json()).error.code).toBe("CSRF_ERROR");
      const headers = new Headers(body ? { "content-type": "application/json" } : {});
      const unauthenticated = await app.handle(
        new Request(`http://localhost/api/applications/${path}`, {
          method,
          headers,
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
      );
      expect(unauthenticated.status).toBe(401);
    }
  });

  it("rejects malformed IDs and strict invalid bodies", async () => {
    const { app, owner, id } = await fixture();
    const cases = [
      [`bad/preparation`, "PUT", { companyResearch: "Note" }, 400, "INVALID_ID"],
      [`${id}/contacts/nope`, "PATCH", { name: "Alex" }, 400, "INVALID_ID"],
      [`${id}/follow-ups/0/complete`, "POST", undefined, 400, "INVALID_ID"],
      [`${id}/preparation`, "PUT", {}, 422, "VALIDATION_ERROR"],
      [`${id}/preparation`, "PUT", { userId: 3 }, 422, "VALIDATION_ERROR"],
      [
        `${id}/contacts`,
        "POST",
        { name: "Alex", role: "Recruiter", profileUrl: "javascript:alert(1)" },
        422,
        "VALIDATION_ERROR",
      ],
      [`${id}/contacts`, "POST", { name: "Alex", role: "Recruiter", id: 99 }, 422, "VALIDATION_ERROR"],
      [`${id}/contacts/1`, "PATCH", { createdAt: "2026-01-01" }, 422, "VALIDATION_ERROR"],
      [`${id}/follow-ups`, "POST", { title: "Check in", dueDate: "2026-02-30" }, 422, "VALIDATION_ERROR"],
      [
        `${id}/follow-ups`,
        "POST",
        { title: "Check in", dueDate: "2026-10-01", completedAt: "2026-09-01" },
        422,
        "VALIDATION_ERROR",
      ],
      [`${id}/follow-ups/1`, "PATCH", { completedAt: null }, 422, "VALIDATION_ERROR"],
      [`${id}/follow-ups/1/complete`, "POST", { completedAt: "2026-10-01T00:00:00Z" }, 422, "VALIDATION_ERROR"],
    ] as const;
    for (const [path, method, body, status, code] of cases) {
      const response = await request(app, owner, path, method, body);
      expect(response.status, `${method} ${path}`).toBe(status);
      expect((await response.json()).error.code).toBe(code);
    }
  });

  it("hides other users and wrong-parent children across reads and mutations", async () => {
    const { app, owner, other, id, secondId, create } = await fixture();
    const otherId = await create("Other private application", other);
    const contactResponse = await request(app, owner, `${id}/contacts`, "POST", { name: "Owner", role: "Recruiter" });
    const contact = ((await contactResponse.json()) as ApplicationContactResponse).data.contact;
    const taskResponse = await request(app, owner, `${id}/follow-ups`, "POST", {
      title: "Private task",
      dueDate: "2026-10-01",
    });
    const task = ((await taskResponse.json()) as ApplicationFollowUpTaskResponse).data.followUpTask;
    const operations = [
      [`${id}`, "GET", undefined],
      [`${id}/preparation`, "PUT", { companyResearch: "Stolen" }],
      [`${id}/contacts`, "POST", { name: "Stolen", role: "Recruiter" }],
      [`${id}/contacts/${contact.id}`, "PATCH", { name: "Stolen" }],
      [`${id}/contacts/${contact.id}`, "DELETE", undefined],
      [`${id}/follow-ups`, "POST", { title: "Stolen", dueDate: "2026-10-01" }],
      [`${id}/follow-ups/${task.id}`, "PATCH", { title: "Stolen" }],
      [`${id}/follow-ups/${task.id}/complete`, "POST", undefined],
      [`${id}/follow-ups/${task.id}`, "DELETE", undefined],
    ] as const;
    for (const [path, method, body] of operations) {
      const response = await request(app, other, path, method, body);
      expect(response.status, `${method} ${path}`).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    }
    for (const [path, method, body] of [
      [`${secondId}/contacts/${contact.id}`, "PATCH", { name: "Wrong parent" }],
      [`${secondId}/contacts/${contact.id}`, "DELETE", undefined],
      [`${secondId}/follow-ups/${task.id}`, "PATCH", { title: "Wrong parent" }],
      [`${secondId}/follow-ups/${task.id}/complete`, "POST", undefined],
      [`${secondId}/follow-ups/${task.id}`, "DELETE", undefined],
      [`${otherId}/contacts/${contact.id}`, "PATCH", { name: "Wrong owner" }],
    ] as const) {
      const response = await request(app, owner, path, method, body);
      expect(response.status, `${method} ${path}`).toBe(404);
    }
    const detail = (await (await request(app, owner, String(id))).json()) as ApplicationDetailResponse;
    expect(detail.data.contacts[0].name).toBe("Owner");
    expect(detail.data.followUpTasks[0]).toMatchObject({ title: "Private task", completedAt: null });
  });
});
