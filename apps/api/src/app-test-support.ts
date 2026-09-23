import type {
  ApplicationContact,
  ApplicationEvent,
  ApplicationFollowUpTask,
  ApplicationPreparation,
  AuthResponse,
  JobApplication,
  SupportedLocale,
  ThemePreference,
} from "@xeniway/shared";
import type { AppDependencies, createApp } from "./app";
import { withApplicationCreationEvent } from "./application-history";
import type {
  ApplicationExportRecord,
  ApplicationRepository,
  PasswordResetTokenRepository,
  SessionRepository,
  UserPreferencesRepository,
  UserRepository,
} from "./db/repository";
import type { PasswordResetMailer } from "./services/mailer";

export function createDependencies(): AppDependencies {
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
  const preparations = new Map<number, ApplicationPreparation>();
  const contacts: ApplicationContact[] = [];
  const followUpTasks: ApplicationFollowUpTask[] = [];
  const applicationUserIds = new Map<number, number>();
  let nextApplicationId = 1;
  let nextContactId = 1;
  let nextTaskId = 1;

  function removeForApplication<T extends { applicationId: number }>(records: T[], applicationId: number): void {
    for (let index = records.length - 1; index >= 0; index--) {
      if (records[index]?.applicationId === applicationId) records.splice(index, 1);
    }
  }

  function removeApplicationData(applicationId: number): void {
    applicationUserIds.delete(applicationId);
    preparations.delete(applicationId);
    removeForApplication(events, applicationId);
    removeForApplication(contacts, applicationId);
    removeForApplication(followUpTasks, applicationId);
  }

  const emptyPreparation = (): ApplicationPreparation => ({
    companyResearch: null,
    talkingPoints: null,
    interviewerQuestions: null,
    updatedAt: null,
  });

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
    async loadWorkspace(userId, applicationId) {
      if (!(await this.findById(userId, applicationId, { anyState: true }))) return null;
      return {
        preparation: preparations.get(applicationId) ?? emptyPreparation(),
        contacts: contacts
          .filter((contact) => contact.applicationId === applicationId)
          .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id - right.id),
        followUpTasks: followUpTasks
          .filter((task) => task.applicationId === applicationId)
          .sort((left, right) => {
            if (!!left.completedAt !== !!right.completedAt) return left.completedAt ? 1 : -1;
            if (!left.completedAt && !right.completedAt)
              return left.dueDate.localeCompare(right.dueDate) || left.id - right.id;
            return (left.completedAt ?? "").localeCompare(right.completedAt ?? "") || left.id - right.id;
          }),
      };
    },
    async updatePreparation(userId, applicationId, input) {
      if (!(await this.findById(userId, applicationId, { anyState: true }))) return null;
      const previous = preparations.get(applicationId) ?? emptyPreparation();
      const preparation: ApplicationPreparation = {
        companyResearch: input.companyResearch === undefined ? previous.companyResearch : input.companyResearch,
        talkingPoints: input.talkingPoints === undefined ? previous.talkingPoints : input.talkingPoints,
        interviewerQuestions:
          input.interviewerQuestions === undefined ? previous.interviewerQuestions : input.interviewerQuestions,
        updatedAt: new Date().toISOString(),
      };
      preparations.set(applicationId, preparation);
      return preparation;
    },
    async createContact(userId, applicationId, input) {
      if (!(await this.findById(userId, applicationId, { anyState: true }))) return null;
      const now = new Date().toISOString();
      const contact: ApplicationContact = {
        id: nextContactId++,
        applicationId,
        name: input.name,
        role: input.role,
        email: input.email ?? null,
        phone: input.phone ?? null,
        profileUrl: input.profileUrl ?? null,
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      };
      contacts.push(contact);
      return contact;
    },
    async updateContact(userId, applicationId, contactId, input) {
      if (!(await this.findById(userId, applicationId, { anyState: true }))) return null;
      const contact = contacts.find((item) => item.id === contactId && item.applicationId === applicationId);
      if (!contact) return null;
      if (input.name !== undefined) contact.name = input.name;
      if (input.role !== undefined) contact.role = input.role;
      if (input.email !== undefined) contact.email = input.email;
      if (input.phone !== undefined) contact.phone = input.phone;
      if (input.profileUrl !== undefined) contact.profileUrl = input.profileUrl;
      if (input.notes !== undefined) contact.notes = input.notes;
      contact.updatedAt = new Date().toISOString();
      return contact;
    },
    async deleteContact(userId, applicationId, contactId) {
      if (!(await this.findById(userId, applicationId, { anyState: true }))) return false;
      const index = contacts.findIndex((item) => item.id === contactId && item.applicationId === applicationId);
      if (index === -1) return false;
      contacts.splice(index, 1);
      return true;
    },
    async createFollowUpTask(userId, applicationId, input) {
      if (!(await this.findById(userId, applicationId, { anyState: true }))) return null;
      const now = new Date().toISOString();
      const task: ApplicationFollowUpTask = {
        id: nextTaskId++,
        applicationId,
        title: input.title,
        dueDate: input.dueDate,
        notes: input.notes ?? null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      followUpTasks.push(task);
      return task;
    },
    async updateFollowUpTask(userId, applicationId, taskId, input) {
      if (!(await this.findById(userId, applicationId, { anyState: true }))) return null;
      const task = followUpTasks.find((item) => item.id === taskId && item.applicationId === applicationId);
      if (!task) return null;
      if (input.title !== undefined) task.title = input.title;
      if (input.dueDate !== undefined) task.dueDate = input.dueDate;
      if (input.notes !== undefined) task.notes = input.notes;
      task.updatedAt = new Date().toISOString();
      return task;
    },
    async completeFollowUpTask(userId, applicationId, taskId) {
      if (!(await this.findById(userId, applicationId, { anyState: true }))) return null;
      const task = followUpTasks.find((item) => item.id === taskId && item.applicationId === applicationId);
      if (!task) return null;
      if (!task.completedAt) task.completedAt = task.updatedAt = new Date().toISOString();
      return task;
    },
    async deleteFollowUpTask(userId, applicationId, taskId) {
      if (!(await this.findById(userId, applicationId, { anyState: true }))) return false;
      const index = followUpTasks.findIndex((item) => item.id === taskId && item.applicationId === applicationId);
      if (index === -1) return false;
      followUpTasks.splice(index, 1);
      return true;
    },
    async listForExport(userId): Promise<ApplicationExportRecord[]> {
      return applications
        .filter((application) => applicationUserIds.get(application.id) === userId)
        .map((application) => ({
          application,
          events: withApplicationCreationEvent(
            application,
            events.filter((event) => event.applicationId === application.id),
          ),
        }));
    },
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
            (options.archived ? application.archivedAt : !application.archivedAt) &&
            !application.blacklistedAt &&
            (!options.status || application.status === options.status) &&
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
        id: nextApplicationId++,
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
      removeApplicationData(id);
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
        removeApplicationData(application.id);
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

export function cookieValue(response: Response, name: string): string {
  const cookie = response.headers.get("set-cookie") ?? "";
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  if (!match?.[1]) throw new Error(`Missing ${name} cookie`);
  return match[1];
}

export async function createCsrf(app: ReturnType<typeof createApp>) {
  const response = await app.handle(new Request("http://localhost/api/auth/csrf"));
  const payload = (await response.json()) as { data: { csrfToken: string } };
  return { csrfToken: payload.data.csrfToken, sessionId: cookieValue(response, "session_id") };
}

export async function register(app: ReturnType<typeof createApp>, email: string) {
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

export function jsonRequest(url: string, init: RequestInit, sessionId: string, csrfToken: string): Request {
  const headers = new Headers(init.headers);
  headers.set("cookie", `session_id=${sessionId}`);
  headers.set("x-csrf-token", csrfToken);
  return new Request(url, { ...init, headers });
}
