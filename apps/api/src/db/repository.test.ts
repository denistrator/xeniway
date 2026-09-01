import { describe, expect, it } from "vitest";
import { toJobApplication, toUser } from "./repository";
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
      appliedAt: "2026-08-20",
      notes: "Follow up next week",
      createdAt: new Date("2026-08-01T10:00:00.000Z"),
      updatedAt: new Date("2026-08-21T10:00:00.000Z"),
      archivedAt: null,
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
      appliedAt: "2026-08-20",
      notes: "Follow up next week",
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-21T10:00:00.000Z",
      archivedAt: null,
    });
  });
});
