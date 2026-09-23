import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, createPostgresClient } from "./client";
import {
  DrizzleApplicationRepository,
  DrizzlePasswordResetTokenRepository,
  DrizzleSessionRepository,
  DrizzleUserPreferencesRepository,
  DrizzleUserRepository,
  toApplicationEvent,
  toJobApplication,
  toUser,
  toUserPreferences,
} from "./repository";
import type { applicationEvents } from "./schema";
import {
  applicationContacts,
  applicationFollowUpTasks,
  applicationWorkspaces,
  jobApplications,
  userPreferences,
  users,
} from "./schema";

const preferenceTimestamps = {
  createdAt: new Date("2026-09-01T10:00:00.000Z"),
  updatedAt: new Date("2026-09-01T10:00:00.000Z"),
};

function createPreferenceRow(
  overrides: Partial<typeof userPreferences.$inferSelect> = {},
): typeof userPreferences.$inferSelect {
  return {
    userId: 7,
    wasIntroduced: false,
    selectedLanguage: null,
    selectedTheme: null,
    selectedFormPresentation: null,
    ...preferenceTimestamps,
    ...overrides,
  };
}

describe("database row mapping", () => {
  it("maps a system activity event without exposing its owner", () => {
    const event: typeof applicationEvents.$inferSelect = {
      id: 8,
      userId: 7,
      applicationId: 3,
      type: "status_changed",
      title: "Status changed",
      description: null,
      occurredAt: new Date("2026-09-02T10:00:00.000Z"),
      createdAt: new Date("2026-09-02T10:00:00.000Z"),
      updatedAt: new Date("2026-09-02T10:00:00.000Z"),
      metadata: { from: "saved", to: "applied" },
      isSystem: true,
    };

    expect(toApplicationEvent(event)).toEqual({
      id: 8,
      applicationId: 3,
      type: "status_changed",
      title: "Status changed",
      description: null,
      occurredAt: "2026-09-02T10:00:00.000Z",
      createdAt: "2026-09-02T10:00:00.000Z",
      updatedAt: "2026-09-02T10:00:00.000Z",
      metadata: { from: "saved", to: "applied" },
      isSystem: true,
    });
    expect(toApplicationEvent(event)).not.toHaveProperty("userId");
  });
  it("maps a user without exposing its password hash", () => {
    const user: typeof users.$inferSelect = {
      id: 7,
      email: "candidate@example.com",
      passwordHash: "secret-hash",
      firstName: "Job",
      lastName: "Candidate",
      createdAt: new Date("2026-09-01T10:00:00.000Z"),
    };

    expect(toUser(user)).toEqual({
      id: 7,
      email: "candidate@example.com",
      firstName: "Job",
      lastName: "Candidate",
      createdAt: "2026-09-01T10:00:00.000Z",
    });
    expect(toUser(user)).not.toHaveProperty("passwordHash");
  });

  it.each([
    [null, null, null],
    ["en", null, "drawer"],
    [null, "light", "modal"],
    ["uk", "dark", "modal"],
  ] as const)("maps selected preferences", (selectedLanguage, selectedTheme, selectedFormPresentation) => {
    const preferences = createPreferenceRow({ selectedLanguage, selectedTheme, selectedFormPresentation });

    expect(toUserPreferences(preferences)).toEqual({
      wasIntroduced: false,
      selectedLanguage,
      selectedTheme,
      selectedFormPresentation,
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
    });
  });

  it("maps all application fields to the public camelCase model", () => {
    const application: typeof jobApplications.$inferSelect = {
      id: 3,
      userId: 7,
      company: "Acme",
      position: "Engineer",
      location: "Remote",
      salary: "$100k",
      jobUrl: "https://example.com/job",
      description: "Build useful things",
      status: "interview",
      sortOrder: 0,
      appliedAt: "2026-08-20",
      notes: "Follow up next week",
      createdAt: new Date("2026-08-01T10:00:00.000Z"),
      updatedAt: new Date("2026-08-21T10:00:00.000Z"),
      archivedAt: null,
      blacklistedAt: null,
      blacklistReason: null,
      seedKey: null,
    };

    expect(toJobApplication(application)).toEqual({
      id: 3,
      company: "Acme",
      position: "Engineer",
      location: "Remote",
      salary: "$100k",
      jobUrl: "https://example.com/job",
      description: "Build useful things",
      status: "interview",
      sortOrder: 0,
      appliedAt: "2026-08-20",
      notes: "Follow up next week",
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-21T10:00:00.000Z",
      archivedAt: null,
      blacklistedAt: null,
      blacklistReason: null,
    });
  });
});

describe("application history transactions", () => {
  it("does not complete application creation when recording history fails", async () => {
    let completed = false;
    const database = {
      transaction: async (callback: (transaction: unknown) => Promise<unknown>) => {
        const transaction = {
          insert: (table: unknown) => ({
            values: () =>
              table === jobApplications
                ? {
                    returning: async () => [
                      {
                        id: 9,
                        userId: 7,
                        company: "Acme",
                        position: "Engineer",
                        status: "saved",
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      },
                    ],
                  }
                : Promise.reject(new Error("event write failed")),
          }),
        };
        const result = await callback(transaction);
        completed = true;
        return result;
      },
    } as never;

    await expect(
      new DrizzleApplicationRepository(database).create(7, { company: "Acme", position: "Engineer", status: "saved" }),
    ).rejects.toThrow("event write failed");
    expect(completed).toBe(false);
  });
});

describe("password reset repository operations", () => {
  it("updates a user's password hash", async () => {
    let updatedValues: unknown;
    const database = {
      update: () => ({
        set: (values: unknown) => {
          updatedValues = values;
          return { where: async () => ({ count: 1 }) };
        },
      }),
    } as never;

    await new DrizzleUserRepository(database).updatePasswordHash(7, "new-hash");

    expect(updatedValues).toEqual({ passwordHash: "new-hash" });
  });

  it("deletes every session belonging to a user", async () => {
    let deleted = false;
    const database = {
      delete: () => ({
        where: async () => {
          deleted = true;
          return { count: 2 };
        },
      }),
    } as never;

    await new DrizzleSessionRepository(database).deleteForUser(7);

    expect(deleted).toBe(true);
  });

  it("invalidates older reset tokens before creating a new one", async () => {
    const operations: string[] = [];
    const database = {
      update: () => ({
        set: () => ({
          where: async () => {
            operations.push("invalidate");
            return { count: 1 };
          },
        }),
      }),
      insert: () => ({
        values: async () => {
          operations.push("create");
          return { count: 1 };
        },
      }),
    } as never;

    const repository = new DrizzlePasswordResetTokenRepository(database);
    await repository.invalidateForUser(7);
    await repository.create({ userId: 7, tokenHash: "hash", expiresAt: new Date() });

    expect(operations).toEqual(["invalidate", "create"]);
  });
});

describe("user preference repository operations", () => {
  it("creates a missing row from a partial update", async () => {
    const rows = new Map<number, typeof userPreferences.$inferSelect>();
    let conflictTarget: unknown;
    const database = {
      insert: () => ({
        values: (values: Partial<typeof userPreferences.$inferInsert> & { userId: number }) => {
          return {
            onConflictDoUpdate: (input: { set: unknown }) => {
              conflictTarget = input;
              return {
                returning: async () => {
                  const row = createPreferenceRow(values);
                  rows.set(row.userId, row);
                  return [row];
                },
              };
            },
          };
        },
      }),
    } as never;

    const result = await new DrizzleUserPreferencesRepository(database).update(7, {
      selectedFormPresentation: "modal",
    });

    expect(rows.get(7)).toMatchObject({
      userId: 7,
      selectedLanguage: null,
      selectedTheme: null,
      selectedFormPresentation: "modal",
    });
    expect(result).toEqual(rows.get(7));
    expect((conflictTarget as { target: unknown }).target).toBe(userPreferences.userId);
  });

  it("preserves omitted values when updating an existing row", async () => {
    const existingRow = createPreferenceRow({
      wasIntroduced: true,
      selectedLanguage: "en",
      selectedTheme: "dark",
    });
    const rows = new Map([[7, existingRow]]);
    const database = {
      insert: () => ({
        values: (values: Partial<typeof userPreferences.$inferInsert> & { userId: number }) => ({
          onConflictDoUpdate: (input: { set: Partial<typeof userPreferences.$inferSelect> }) => ({
            returning: async () => {
              const current = rows.get(values.userId) ?? createPreferenceRow(values);
              const updated = { ...current, ...input.set };
              rows.set(values.userId, updated);
              return [updated];
            },
          }),
        }),
      }),
    } as never;

    const result = await new DrizzleUserPreferencesRepository(database).update(7, { selectedLanguage: "uk" });

    expect(result).toMatchObject({
      wasIntroduced: true,
      selectedLanguage: "uk",
      selectedTheme: "dark",
    });
  });

  it("clears a selected value when the patch explicitly supplies null", async () => {
    const existingRow = createPreferenceRow({ selectedLanguage: "uk", selectedTheme: "dark" });
    const rows = new Map([[7, existingRow]]);
    const database = {
      insert: () => ({
        values: (values: Partial<typeof userPreferences.$inferInsert> & { userId: number }) => ({
          onConflictDoUpdate: (input: { set: Partial<typeof userPreferences.$inferSelect> }) => ({
            returning: async () => {
              const current = rows.get(values.userId) ?? createPreferenceRow(values);
              const updated = { ...current, ...input.set };
              rows.set(values.userId, updated);
              return [updated];
            },
          }),
        }),
      }),
    } as never;

    const result = await new DrizzleUserPreferencesRepository(database).update(7, { selectedTheme: null });

    expect(result).toMatchObject({ selectedLanguage: "uk", selectedTheme: null });
  });
});

const databaseDescribe = process.env.DATABASE_URL ? describe : describe.skip;

function required<T>(value: T | null): T {
  if (value === null) throw new Error("Expected repository to create a record");
  return value;
}

databaseDescribe("application workspace persistence", () => {
  const client = createPostgresClient(process.env.DATABASE_URL ?? "");
  const database = createDatabase(client);
  const repository = new DrizzleApplicationRepository(database);
  let ownerId: number;
  let otherId: number;
  let applicationId: number;
  let otherApplicationId: number;
  let foreignApplicationId: number;

  beforeAll(async () => {
    // A missing migration is a setup failure, not an application behavior failure.
    await database.select({ applicationId: applicationWorkspaces.applicationId }).from(applicationWorkspaces).limit(1);
  });

  beforeEach(async () => {
    const suffix = crypto.randomUUID();
    const [owner, other] = await database
      .insert(users)
      .values([
        { email: `workspace-owner-${suffix}@example.test`, passwordHash: "test-hash" },
        { email: `workspace-other-${suffix}@example.test`, passwordHash: "test-hash" },
      ])
      .returning({ id: users.id });
    ownerId = owner.id;
    otherId = other.id;
    const [application, second, foreign] = await database
      .insert(jobApplications)
      .values([
        { userId: ownerId, company: "First", position: "Engineer" },
        { userId: ownerId, company: "Second", position: "Designer", archivedAt: new Date() },
        { userId: otherId, company: "Foreign", position: "Manager", blacklistedAt: new Date() },
      ])
      .returning({ id: jobApplications.id });
    applicationId = application.id;
    otherApplicationId = second.id;
    foreignApplicationId = foreign.id;
  });

  afterEach(async () => {
    if (ownerId) await database.delete(users).where(eq(users.id, ownerId));
    if (otherId) await database.delete(users).where(eq(users.id, otherId));
  });

  afterAll(async () => {
    await client.end();
  });

  it("loads empty sections and hides another owner's application", async () => {
    expect(await repository.loadWorkspace(ownerId, applicationId)).toEqual({
      preparation: { companyResearch: null, talkingPoints: null, interviewerQuestions: null, updatedAt: null },
      contacts: [],
      followUpTasks: [],
    });
    expect(await repository.loadWorkspace(ownerId, foreignApplicationId)).toBeNull();
  });

  it("upserts preparation for archived and blacklisted parents, preserving omitted fields and explicit null", async () => {
    const first = await repository.updatePreparation(ownerId, otherApplicationId, {
      companyResearch: "Research",
      talkingPoints: "Discuss team",
    });
    expect(first).toMatchObject({ companyResearch: "Research", talkingPoints: "Discuss team" });
    expect(first?.updatedAt).toEqual(expect.any(String));
    expect(await repository.updatePreparation(ownerId, otherApplicationId, { companyResearch: null })).toMatchObject({
      companyResearch: null,
      talkingPoints: "Discuss team",
    });
    expect(await repository.updatePreparation(ownerId, foreignApplicationId, { companyResearch: "Leak" })).toBeNull();
    expect(await repository.loadWorkspace(ownerId, foreignApplicationId)).toBeNull();
    expect(
      await repository.updatePreparation(otherId, foreignApplicationId, { companyResearch: "Allowed" }),
    ).toMatchObject({
      companyResearch: "Allowed",
    });
  });

  it("orders contacts by creation time and ID and maps server timestamps", async () => {
    const later = required(
      await repository.createContact(ownerId, applicationId, { name: "Later", role: "Recruiter" }),
    );
    const earlier = required(
      await repository.createContact(ownerId, applicationId, { name: "Earlier", role: "Manager" }),
    );
    expect(later.createdAt).toEqual(expect.any(String));
    await database
      .update(applicationContacts)
      .set({ createdAt: new Date("2025-01-01T00:00:00.000Z") })
      .where(eq(applicationContacts.id, earlier.id));
    const contacts = (await repository.loadWorkspace(ownerId, applicationId))?.contacts;
    expect(contacts?.map((contact) => contact.name)).toEqual(["Earlier", "Later"]);
    expect(contacts?.[0]).toMatchObject({ applicationId, email: null, phone: null, profileUrl: null, notes: null });
    expect(contacts?.[0].createdAt).toBe("2025-01-01T00:00:00.000Z");
  });

  it("orders incomplete tasks by due date and ID, then completed tasks by completion time and ID", async () => {
    const late = required(
      await repository.createFollowUpTask(ownerId, applicationId, { title: "Late", dueDate: "2026-12-10" }),
    );
    const early = required(
      await repository.createFollowUpTask(ownerId, applicationId, {
        title: "Early",
        dueDate: "2026-10-01",
      }),
    );
    const tie = required(
      await repository.createFollowUpTask(ownerId, applicationId, { title: "Tie", dueDate: "2026-10-01" }),
    );
    const completedFirst = required(
      await repository.createFollowUpTask(ownerId, applicationId, {
        title: "Completed first",
        dueDate: "2026-01-01",
      }),
    );
    const completedLast = required(
      await repository.createFollowUpTask(ownerId, applicationId, {
        title: "Completed last",
        dueDate: "2026-01-01",
      }),
    );
    await repository.completeFollowUpTask(ownerId, applicationId, completedFirst.id);
    await repository.completeFollowUpTask(ownerId, applicationId, completedLast.id);
    await database
      .update(applicationFollowUpTasks)
      .set({ completedAt: new Date("2026-09-01T00:00:00.000Z") })
      .where(eq(applicationFollowUpTasks.id, completedFirst.id));
    await database
      .update(applicationFollowUpTasks)
      .set({ completedAt: new Date("2026-09-02T00:00:00.000Z") })
      .where(eq(applicationFollowUpTasks.id, completedLast.id));
    const tasks = (await repository.loadWorkspace(ownerId, applicationId))?.followUpTasks;
    expect(tasks?.map((task) => task.id)).toEqual([early.id, tie.id, late.id, completedFirst.id, completedLast.id]);
    expect(tasks?.[0].dueDate).toBe("2026-10-01");
    expect(tasks?.[0].completedAt).toBeNull();
    expect(tasks?.[3].completedAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("requires parent ownership on creates, including malformed cross-owner child rows", async () => {
    expect(await repository.createContact(ownerId, foreignApplicationId, { name: "No", role: "No" })).toBeNull();
    expect(
      await repository.createFollowUpTask(ownerId, foreignApplicationId, { title: "No", dueDate: "2026-10-01" }),
    ).toBeNull();
    const [mismatched] = await database
      .insert(applicationContacts)
      .values({ userId: ownerId, applicationId: foreignApplicationId, name: "Mismatched", role: "Recruiter" })
      .returning({ id: applicationContacts.id });
    expect(await repository.loadWorkspace(ownerId, foreignApplicationId)).toBeNull();
    expect(
      await repository.updateContact(ownerId, foreignApplicationId, mismatched.id, { name: "Changed" }),
    ).toBeNull();
    expect(await repository.deleteContact(ownerId, foreignApplicationId, mismatched.id)).toBe(false);
  });

  it("scopes contact mutations to both owner and parent and preserves omitted fields", async () => {
    const contact = required(
      await repository.createContact(ownerId, applicationId, {
        name: "Alex",
        role: "Recruiter",
        email: "alex@example.test",
      }),
    );
    expect(await repository.updateContact(ownerId, otherApplicationId, contact.id, { role: "Manager" })).toBeNull();
    expect(await repository.updateContact(otherId, applicationId, contact.id, { role: "Manager" })).toBeNull();
    expect(await repository.deleteContact(ownerId, otherApplicationId, contact.id)).toBe(false);
    expect(
      await repository.updateContact(ownerId, applicationId, contact.id, { role: "Manager", email: null }),
    ).toMatchObject({
      name: "Alex",
      role: "Manager",
      email: null,
    });
    expect(await repository.deleteContact(ownerId, applicationId, contact.id)).toBe(true);
    expect(await repository.deleteContact(ownerId, applicationId, contact.id)).toBe(false);
  });

  it("scopes task mutation and completion to owner and parent and completes only once", async () => {
    const task = required(
      await repository.createFollowUpTask(ownerId, applicationId, {
        title: "Call",
        dueDate: "2026-10-01",
        notes: "Ask about team",
      }),
    );
    expect(await repository.updateFollowUpTask(ownerId, otherApplicationId, task.id, { title: "No" })).toBeNull();
    expect(await repository.completeFollowUpTask(otherId, applicationId, task.id)).toBeNull();
    expect(await repository.deleteFollowUpTask(ownerId, otherApplicationId, task.id)).toBe(false);
    expect(
      await repository.updateFollowUpTask(ownerId, applicationId, task.id, { title: "Email", notes: null }),
    ).toMatchObject({
      title: "Email",
      dueDate: "2026-10-01",
      notes: null,
    });
    const completed = await repository.completeFollowUpTask(ownerId, applicationId, task.id);
    expect(completed?.completedAt).toEqual(expect.any(String));
    expect(await repository.completeFollowUpTask(ownerId, applicationId, task.id)).toEqual(completed);
    expect(await repository.deleteFollowUpTask(ownerId, applicationId, task.id)).toBe(true);
    expect(await repository.deleteFollowUpTask(ownerId, applicationId, task.id)).toBe(false);
  });

  it("cascades workspace, contacts, and tasks on permanent application deletion", async () => {
    await repository.updatePreparation(ownerId, applicationId, { companyResearch: "Company" });
    await repository.createContact(ownerId, applicationId, { name: "Alex", role: "Recruiter" });
    await repository.createFollowUpTask(ownerId, applicationId, { title: "Email", dueDate: "2026-10-01" });
    expect(await repository.permanentDelete(ownerId, applicationId)).toBe(true);
    expect(
      await database.select().from(applicationWorkspaces).where(eq(applicationWorkspaces.applicationId, applicationId)),
    ).toEqual([]);
    expect(
      await database.select().from(applicationContacts).where(eq(applicationContacts.applicationId, applicationId)),
    ).toEqual([]);
    expect(
      await database
        .select()
        .from(applicationFollowUpTasks)
        .where(eq(applicationFollowUpTasks.applicationId, applicationId)),
    ).toEqual([]);
  });
});
