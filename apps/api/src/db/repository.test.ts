import { describe, expect, it } from "vitest";
import {
  DrizzlePasswordResetTokenRepository,
  DrizzleSessionRepository,
  DrizzleUserPreferencesRepository,
  DrizzleUserRepository,
  toJobApplication,
  toUser,
  toUserPreferences,
} from "./repository";
import type { jobApplications, users } from "./schema";
import { userPreferences } from "./schema";

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
