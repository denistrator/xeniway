import { describe, expect, it } from "vitest";
import {
  DrizzlePasswordResetTokenRepository,
  DrizzleSessionRepository,
  DrizzleUserRepository,
  toJobApplication,
  toUser,
} from "./repository";
import type { jobApplications, users } from "./schema";

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
