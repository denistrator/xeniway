import type {
  ApplicationEvent,
  ApplicationResponse,
  AuthResponse,
  JobApplication,
  SupportedLocale,
  ThemePreference,
} from "@xeniway/shared";
import { describe, expect, it } from "vitest";
import { type AppDependencies, createApp } from "./app";
import type {
  ApplicationRepository,
  PasswordResetTokenRepository,
  SessionRepository,
  UserPreferencesRepository,
  UserRepository,
} from "./db/repository";
import type { PasswordResetMailer } from "./services/mailer";
import { SlidingWindowRateLimiter } from "./services/rate-limit";
import { RedisRateLimitError } from "./services/redis-rate-limit";

function createDependencies(): AppDependencies {
  const users: Array<{
    id: number;
    email: string;
    passwordHash: string;
    firstName: string | null;
    lastName: string | null;
    createdAt: Date;
  }> = [];
  const sessions = new Map<string, { id: string; userId: number | null; csrfToken: string; expiresAt: Date }>();
  const resetTokens: Array<{ userId: number; tokenHash: string; expiresAt: Date; usedAt: Date | null }> = [];
  const applications: JobApplication[] = [];
  const events: ApplicationEvent[] = [];

  const userRepository: UserRepository = {
    async findByEmail(email) {
      return users.find((user) => user.email === email) ?? null;
    },
    async findById(id) {
      return users.find((user) => user.id === id) ?? null;
    },
    async create(input) {
      const user = {
        id: users.length + 1,
        email: input.email,
        passwordHash: input.passwordHash,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
      };
      users.push(user);
      return user;
    },
    async updatePasswordHash(id, passwordHash) {
      const user = users.find((candidate) => candidate.id === id);
      if (!user) return false;
      user.passwordHash = passwordHash;
      return true;
    },
  };

  const sessionRepository: SessionRepository = {
    async create(input) {
      sessions.set(input.id, input);
    },
    async findActive(id) {
      const session = sessions.get(id);
      return session && session.expiresAt > new Date() ? session : null;
    },
    async delete(id) {
      sessions.delete(id);
    },
    async deleteForUser(userId) {
      for (const [id, session] of sessions) {
        if (session.userId === userId) sessions.delete(id);
      }
    },
    async deleteExpired() {},
  };

  const applicationRepository: ApplicationRepository = {
    async listEvents(userId, applicationId) {
      if (applicationUserIds.get(applicationId) !== userId) return [];
      return events
        .filter((event) => event.applicationId === applicationId)
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || right.id - left.id);
    },
    async createEvent(userId, applicationId, input) {
      if (applicationUserIds.get(applicationId) !== userId) return null;
      const now = new Date().toISOString();
      const event: ApplicationEvent = {
        id: events.length + 1,
        applicationId,
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        occurredAt: new Date(input.occurredAt).toISOString(),
        createdAt: now,
        updatedAt: now,
        metadata: null,
        isSystem: false,
      };
      events.push(event);
      return event;
    },
    async updateEvent(userId, applicationId, eventId, input) {
      if (applicationUserIds.get(applicationId) !== userId) return null;
      const event = events.find(
        (candidate) => candidate.id === eventId && candidate.applicationId === applicationId && !candidate.isSystem,
      );
      if (!event) return null;
      Object.assign(event, input, {
        occurredAt: input.occurredAt ? new Date(input.occurredAt).toISOString() : event.occurredAt,
        updatedAt: new Date().toISOString(),
      });
      return event;
    },
    async deleteEvent(userId, applicationId, eventId) {
      if (applicationUserIds.get(applicationId) !== userId) return false;
      const index = events.findIndex(
        (candidate) => candidate.id === eventId && candidate.applicationId === applicationId && !candidate.isSystem,
      );
      if (index === -1) return false;
      events.splice(index, 1);
      return true;
    },
    async list(userId, options = {}) {
      return applications
        .filter(
          (application) =>
            application.id > 0 &&
            (options.archived ? application.archivedAt : !application.archivedAt) &&
            !application.blacklistedAt &&
            (!options.status || application.status === options.status) &&
            applications.find((candidate) => candidate.id === application.id)?.id === application.id &&
            applicationUserIds.get(application.id) === userId,
        )
        .sort((left, right) => left.sortOrder - right.sortOrder);
    },
    async findById(userId, id, options = {}) {
      return (
        applications.find(
          (application) =>
            application.id === id &&
            applicationUserIds.get(id) === userId &&
            (options.anyState ||
              ((options.archived ? !!application.archivedAt : !application.archivedAt) && !application.blacklistedAt)),
        ) ?? null
      );
    },
    async create(userId, input) {
      const now = new Date().toISOString();
      const application: JobApplication = {
        id: applications.length + 1,
        company: input.company,
        position: input.position,
        location: input.location ?? null,
        salary: input.salary ?? null,
        jobUrl: input.jobUrl ?? null,
        description: input.description ?? null,
        status: input.status,
        sortOrder: applications.filter((candidate) => candidate.status === input.status).length,
        appliedAt: input.appliedAt ?? null,
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
        blacklistedAt: null,
        blacklistReason: null,
      };
      applications.push(application);
      applicationUserIds.set(application.id, userId);
      return application;
    },
    async reorder(userId, status, applicationIds) {
      const owned = applications.filter(
        (application) =>
          application.status === status && !application.archivedAt && applicationUserIds.get(application.id) === userId,
      );
      if (
        owned.length !== applicationIds.length ||
        !owned.every((application) => applicationIds.includes(application.id))
      )
        return false;
      for (const [sortOrder, id] of applicationIds.entries()) {
        const application = owned.find((candidate) => candidate.id === id);
        if (application) application.sortOrder = sortOrder;
      }
      return true;
    },
    async update(userId, id, input) {
      const application = await this.findById(userId, id);
      if (!application) return null;
      Object.assign(application, input, { updatedAt: new Date().toISOString() });
      return application;
    },
    async archive(userId, id) {
      const application = await this.findById(userId, id);
      if (!application) return false;
      application.archivedAt = new Date().toISOString();
      return true;
    },
    async restore(userId, id) {
      const application = await this.findById(userId, id, { archived: true });
      if (!application) return false;
      application.archivedAt = null;
      return true;
    },
    async permanentDelete(userId, id) {
      const application = applications.find(
        (candidate) => candidate.id === id && applicationUserIds.get(id) === userId,
      );
      if (!application) return false;
      applications.splice(applications.indexOf(application), 1);
      applicationUserIds.delete(id);
      return true;
    },
    async removeAll(userId, board) {
      const matches = applications.filter((application) => {
        if (applicationUserIds.get(application.id) !== userId) return false;
        if (board === "archive") return !!application.archivedAt;
        if (board === "blacklist") return !!application.blacklistedAt;
        return !application.archivedAt && !application.blacklistedAt;
      });
      for (const application of matches) {
        applications.splice(applications.indexOf(application), 1);
        applicationUserIds.delete(application.id);
      }
      return matches.length;
    },
    async listBlacklisted(userId) {
      return applications
        .filter((application) => applicationUserIds.get(application.id) === userId && !!application.blacklistedAt)
        .sort((left, right) => (right.blacklistedAt ?? "").localeCompare(left.blacklistedAt ?? ""));
    },
    async blacklist(userId, id, reason) {
      const application = applications.find(
        (candidate) =>
          candidate.id === id &&
          applicationUserIds.get(id) === userId &&
          !candidate.archivedAt &&
          !candidate.blacklistedAt,
      );
      if (!application) return false;
      application.blacklistedAt = new Date().toISOString();
      application.blacklistReason = reason ?? null;
      return true;
    },
    async unblacklist(userId, id) {
      const application = applications.find(
        (candidate) => candidate.id === id && applicationUserIds.get(id) === userId && !!candidate.blacklistedAt,
      );
      if (!application) return false;
      application.blacklistedAt = null;
      application.blacklistReason = null;
      return true;
    },
  };

  const applicationUserIds = new Map<number, number>();
  const passwordResetTokens: PasswordResetTokenRepository = {
    async invalidateForUser(userId) {
      for (const token of resetTokens) if (token.userId === userId && !token.usedAt) token.usedAt = new Date();
    },
    async create(input) {
      resetTokens.push({ ...input, usedAt: null });
    },
    async consume(tokenHash, now = new Date()) {
      const token = resetTokens.find(
        (candidate) => candidate.tokenHash === tokenHash && !candidate.usedAt && candidate.expiresAt > now,
      );
      if (!token) return null;
      token.usedAt = now;
      return { userId: token.userId };
    },
  };
  const passwordResetMailer: PasswordResetMailer = {
    async sendPasswordReset() {},
  };
  const userPreferences = new Map<
    number,
    {
      userId: number;
      wasIntroduced: boolean;
      selectedLanguage: SupportedLocale | null;
      selectedTheme: ThemePreference | null;
      selectedFormPresentation: "drawer" | "modal" | null;
      createdAt: Date;
      updatedAt: Date;
    }
  >();
  const preferences: UserPreferencesRepository = {
    async findByUserId(userId) {
      return userPreferences.get(userId) ?? null;
    },
    async update(userId, input) {
      const now = new Date();
      const existing = userPreferences.get(userId);
      const row = existing ?? {
        userId,
        wasIntroduced: false,
        selectedLanguage: null,
        selectedTheme: null,
        selectedFormPresentation: null,
        createdAt: now,
        updatedAt: now,
      };
      if (input.selectedLanguage !== undefined) row.selectedLanguage = input.selectedLanguage;
      if (input.selectedTheme !== undefined) row.selectedTheme = input.selectedTheme;
      if (input.selectedFormPresentation !== undefined) row.selectedFormPresentation = input.selectedFormPresentation;
      row.updatedAt = now;
      userPreferences.set(userId, row);
      return row;
    },
    async markIntroduced(userId) {
      const now = new Date();
      const existing = userPreferences.get(userId);
      const row = existing ?? {
        userId,
        wasIntroduced: false,
        selectedLanguage: null,
        selectedTheme: null,
        selectedFormPresentation: null,
        createdAt: now,
        updatedAt: now,
      };
      row.wasIntroduced = true;
      row.updatedAt = now;
      userPreferences.set(userId, row);
      return row;
    },
  };
  return {
    users: userRepository,
    sessions: sessionRepository,
    preferences,
    applications: applicationRepository,
    passwordResetTokens,
    passwordResetMailer,
    passwordHasher: {
      async hash(password) {
        return `hashed:${password}`;
      },
      async verify(password, hash) {
        return hash === `hashed:${password}`;
      },
    },
  };
}

function cookieValue(response: Response, name: string): string {
  const cookie = response.headers.get("set-cookie") ?? "";
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  if (!match?.[1]) throw new Error(`Missing ${name} cookie`);
  return match[1];
}

async function createCsrf(app: ReturnType<typeof createApp>) {
  const response = await app.handle(new Request("http://localhost/api/auth/csrf"));
  const payload = (await response.json()) as { data: { csrfToken: string } };
  return { csrfToken: payload.data.csrfToken, sessionId: cookieValue(response, "session_id") };
}

async function register(app: ReturnType<typeof createApp>, email: string) {
  const csrf = await createCsrf(app);
  const response = await app.handle(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `session_id=${csrf.sessionId}`,
        "x-csrf-token": csrf.csrfToken,
      },
      body: JSON.stringify({ email, password: "password123" }),
    }),
  );
  const payload = (await response.json()) as AuthResponse;
  return {
    response,
    payload,
    sessionId: response.headers.has("set-cookie") ? cookieValue(response, "session_id") : "",
  };
}

function jsonRequest(url: string, init: RequestInit, sessionId: string, csrfToken: string): Request {
  const headers = new Headers(init.headers);
  headers.set("cookie", `session_id=${sessionId}`);
  headers.set("x-csrf-token", csrfToken);
  return new Request(url, { ...init, headers });
}

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
  it("uses the validated production mode for secure session cookies", async () => {
    const app = createApp({ ...createDependencies(), secureCookies: true });

    const response = await app.handle(new Request("http://localhost/api/auth/csrf"));

    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("reads and completes user introduction preferences with CSRF protection", async () => {
    const app = createApp(createDependencies());
    const account = await register(app, "preferences@example.com");
    const csrf = { sessionId: account.sessionId, csrfToken: account.payload.data.csrfToken };

    const initial = await app.handle(
      new Request("http://localhost/api/user/preferences", {
        headers: { cookie: `session_id=${csrf.sessionId}` },
      }),
    );
    expect(initial.status).toBe(200);
    expect((await initial.json()).data.preferences).toMatchObject({
      wasIntroduced: false,
      selectedLanguage: null,
      selectedTheme: null,
      selectedFormPresentation: null,
    });

    const invalid = await app.handle(
      new Request("http://localhost/api/user/preferences/introduced", {
        method: "POST",
        headers: { cookie: `session_id=${csrf.sessionId}` },
      }),
    );
    expect(invalid.status).toBe(403);

    const completed = await app.handle(
      jsonRequest(
        "http://localhost/api/user/preferences/introduced",
        { method: "POST" },
        csrf.sessionId,
        csrf.csrfToken,
      ),
    );
    expect(completed.status).toBe(200);
    expect((await completed.json()).data.preferences.wasIntroduced).toBe(true);
  });

  it("keeps introduction preferences isolated between accounts", async () => {
    const app = createApp(createDependencies());
    const first = await register(app, "first-preferences@example.com");
    const second = await register(app, "second-preferences@example.com");

    const completed = await app.handle(
      jsonRequest(
        "http://localhost/api/user/preferences/introduced",
        { method: "POST" },
        first.sessionId,
        first.payload.data.csrfToken,
      ),
    );
    expect(completed.status).toBe(200);

    const secondPreferences = await app.handle(
      new Request("http://localhost/api/user/preferences", {
        headers: { cookie: `session_id=${second.sessionId}` },
      }),
    );
    expect((await secondPreferences.json()).data.preferences.wasIntroduced).toBe(false);
  });

  it("updates both user preferences and preserves omitted values", async () => {
    const app = createApp(createDependencies());
    const account = await register(app, "update-preferences@example.com");
    const csrf = { sessionId: account.sessionId, csrfToken: account.payload.data.csrfToken };

    const initial = await app.handle(
      jsonRequest(
        "http://localhost/api/user/preferences",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            selectedLanguage: "uk",
            selectedTheme: "dark",
            selectedFormPresentation: "modal",
          }),
        },
        csrf.sessionId,
        csrf.csrfToken,
      ),
    );
    expect(initial.status).toBe(200);
    expect((await initial.json()).data.preferences).toMatchObject({
      selectedLanguage: "uk",
      selectedTheme: "dark",
      selectedFormPresentation: "modal",
    });

    const languageOnly = await app.handle(
      jsonRequest(
        "http://localhost/api/user/preferences",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ selectedLanguage: "ru" }),
        },
        csrf.sessionId,
        csrf.csrfToken,
      ),
    );
    expect(languageOnly.status).toBe(200);
    expect((await languageOnly.json()).data.preferences).toMatchObject({
      selectedLanguage: "ru",
      selectedTheme: "dark",
      selectedFormPresentation: "modal",
    });
  });

  it("validates preference updates and protects them with authentication and CSRF", async () => {
    const app = createApp(createDependencies());
    const unauthenticated = await app.handle(
      new Request("http://localhost/api/user/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selectedLanguage: "uk" }),
      }),
    );
    expect(unauthenticated.status).toBe(401);

    const account = await register(app, "invalid-preferences@example.com");
    const csrf = { sessionId: account.sessionId, csrfToken: account.payload.data.csrfToken };
    const missingCsrf = await app.handle(
      new Request("http://localhost/api/user/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie: `session_id=${csrf.sessionId}` },
        body: JSON.stringify({ selectedTheme: "dark" }),
      }),
    );
    expect(missingCsrf.status).toBe(403);

    const invalidCsrf = await app.handle(
      jsonRequest(
        "http://localhost/api/user/preferences",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ selectedTheme: "dark" }),
        },
        csrf.sessionId,
        "invalid-csrf-token",
      ),
    );
    expect(invalidCsrf.status).toBe(403);

    const invalid = await app.handle(
      jsonRequest(
        "http://localhost/api/user/preferences",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ selectedLanguage: "de", selectedTheme: "solarized" }),
        },
        csrf.sessionId,
        csrf.csrfToken,
      ),
    );
    expect(invalid.status).toBe(422);
    expect((await invalid.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("does not expose preference values across accounts", async () => {
    const app = createApp(createDependencies());
    const first = await register(app, "first-update-preferences@example.com");
    const second = await register(app, "second-update-preferences@example.com");

    const updated = await app.handle(
      jsonRequest(
        "http://localhost/api/user/preferences",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ selectedLanguage: "uk", selectedTheme: "dark" }),
        },
        first.sessionId,
        first.payload.data.csrfToken,
      ),
    );
    expect(updated.status).toBe(200);

    const secondPreferences = await app.handle(
      new Request("http://localhost/api/user/preferences", {
        headers: { cookie: `session_id=${second.sessionId}` },
      }),
    );
    expect((await secondPreferences.json()).data.preferences).toMatchObject({
      selectedLanguage: null,
      selectedTheme: null,
    });
  });

  it("returns a generic response for both known and unknown password reset emails", async () => {
    const app = createApp(createDependencies());
    const account = await register(app, "candidate@example.com");
    const csrf = { sessionId: account.sessionId, csrfToken: account.payload.data.csrfToken };

    const requestReset = (email: string) =>
      app.handle(
        jsonRequest(
          "http://localhost/api/auth/password-reset/request",
          { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) },
          csrf.sessionId,
          csrf.csrfToken,
        ),
      );

    const known = await requestReset("candidate@example.com");
    const unknown = await requestReset("missing@example.com");

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
  });

  it("rejects unauthenticated application access", async () => {
    const response = await createApp(createDependencies()).handle(new Request("http://localhost/api/applications"));
    expect(response.status).toBe(401);
  });

  it("registers, authenticates, and creates an application with CSRF protection", async () => {
    const app = createApp(createDependencies());
    const csrfResponse = await app.handle(new Request("http://localhost/api/auth/csrf"));
    const csrfToken = ((await csrfResponse.json()) as { data: { csrfToken: string } }).data.csrfToken;
    const csrfCookie = cookieValue(csrfResponse, "session_id");

    const authResponse = await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session_id=${csrfCookie}`,
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ email: "candidate@example.com", password: "password123" }),
      }),
    );
    expect(authResponse.status).toBe(201);
    const authPayload = (await authResponse.json()) as AuthResponse;
    expect(authPayload.data.user.email).toBe("candidate@example.com");
    const sessionCookie = cookieValue(authResponse, "session_id");

    const applicationResponse = await app.handle(
      new Request("http://localhost/api/applications", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session_id=${sessionCookie}`,
          "x-csrf-token": authPayload.data.csrfToken,
        },
        body: JSON.stringify({ company: "Acme", position: "Engineer", status: "interview" }),
      }),
    );
    expect(applicationResponse.status).toBe(201);
    expect(((await applicationResponse.json()) as ApplicationResponse).data.application.company).toBe("Acme");
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

  it("rejects invalid CSRF and request payloads with stable errors", async () => {
    const app = createApp(createDependencies());
    const csrf = await createCsrf(app);
    const csrfFailure = await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `session_id=${csrf.sessionId}` },
        body: JSON.stringify({ email: "candidate@example.com", password: "password123" }),
      }),
    );
    expect(csrfFailure.status).toBe(403);
    expect(((await csrfFailure.json()) as { error: { code: string } }).error.code).toBe("CSRF_ERROR");

    const validationFailure = await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session_id=${csrf.sessionId}`,
          "x-csrf-token": csrf.csrfToken,
        },
        body: JSON.stringify({ email: "not-an-email", password: "short" }),
      }),
    );
    expect(validationFailure.status).toBe(422);
    expect(
      ((await validationFailure.json()) as { error: { code: string; fields: Record<string, string[]> } }).error,
    ).toMatchObject({
      code: "VALIDATION_ERROR",
      fields: { email: expect.any(Array), password: expect.any(Array) },
    });
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

  it("rate limits repeated registration attempts", async () => {
    const dependencies = createDependencies();
    const app = createApp({
      ...dependencies,
      authRateLimiter: new SlidingWindowRateLimiter({ limit: 1, windowMs: 60_000 }),
    });
    const first = await register(app, "candidate@example.com");
    expect(first.response.status).toBe(201);

    const second = await register(app, "candidate@example.com");
    expect(second.response.status).toBe(429);
    expect(second.response.headers.get("retry-after")).toBe("60");
    expect((second.payload as unknown as { error: { code: string } }).error.code).toBe("RATE_LIMITED");
  });

  it("fails closed when the authentication rate limiter is unavailable", async () => {
    const dependencies = createDependencies();
    const app = createApp({
      ...dependencies,
      authRateLimiter: {
        async consume() {
          throw new RedisRateLimitError(new Error("Redis unavailable"));
        },
      },
    });
    const csrf = await createCsrf(app);

    const response = await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session_id=${csrf.sessionId}`,
          "x-csrf-token": csrf.csrfToken,
        },
        body: JSON.stringify({ email: "candidate@example.com", password: "password123" }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { code: "RATE_LIMIT_UNAVAILABLE", message: "Authentication rate limiting is unavailable" },
    });
  });

  it("reports database and Redis health", async () => {
    const app = createApp({
      ...createDependencies(),
      health: async () => true,
      redisHealth: async () => true,
    });

    const response = await app.handle(new Request("http://localhost/api/health"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", database: "up", redis: "up" });
  });

  it("reports Redis health failures", async () => {
    const app = createApp({
      ...createDependencies(),
      health: async () => true,
      redisHealth: async () => false,
    });

    const response = await app.handle(new Request("http://localhost/api/health"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: { code: "REDIS_UNAVAILABLE", message: "Redis is unavailable" } });
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
