import { describe, expect, it } from "vitest";
import { assertDevelopmentSeedAllowed, buildSeedApplications, buildSeedFixtures, seedAccounts } from "./seed";

describe("development seed", () => {
  it("requires an explicit development seed opt-in", () => {
    expect(() =>
      assertDevelopmentSeedAllowed({
        databaseUrl: "postgres://xeniway:xeniway@localhost:5432/xeniway",
      }),
    ).toThrow("ALLOW_DEVELOPMENT_SEED=true is required");
  });

  it("allows an explicitly opted-in local database", () => {
    expect(() =>
      assertDevelopmentSeedAllowed({
        databaseUrl: "postgres://xeniway:xeniway@localhost:5432/xeniway",
        allowDevelopmentSeed: "true",
      }),
    ).not.toThrow();
  });

  it("rejects production seeding even when explicitly opted in", () => {
    expect(() =>
      assertDevelopmentSeedAllowed({
        databaseUrl: "postgres://app:password@db.example.com:5432/xeniway",
        nodeEnv: "production",
        allowDevelopmentSeed: "true",
      }),
    ).toThrow("Development seed is disabled in production");
  });

  it("rejects a non-local database", () => {
    expect(() =>
      assertDevelopmentSeedAllowed({
        databaseUrl: "postgres://app:password@db.example.com:5432/xeniway",
        allowDevelopmentSeed: "true",
      }),
    ).toThrow("Development seed requires a local PostgreSQL host");
  });

  it("rejects a non-PostgreSQL local URL", () => {
    expect(() =>
      assertDevelopmentSeedAllowed({
        databaseUrl: "mysql://root:password@localhost:3306/xeniway",
        allowDevelopmentSeed: "true",
      }),
    ).toThrow("DATABASE_URL must use postgres: or postgresql:");
  });

  it("builds three deterministic applications per status for each account", () => {
    const applications = buildSeedApplications(seedAccounts.map((account) => account.key));

    expect(applications).toHaveLength(36);
    expect(new Set(applications.map((application) => application.seedKey)).size).toBe(36);
    for (const userKey of seedAccounts.map((account) => account.key)) {
      const userApplications = applications.filter((application) => application.userKey === userKey);
      expect(userApplications).toHaveLength(18);
      expect(new Set(userApplications.map((application) => application.status))).toEqual(
        new Set(["saved", "applied", "interview", "offer", "rejected", "withdrawn"]),
      );
    }
  });

  it("builds complete deterministic board and workspace fixtures for each account", () => {
    const today = new Date("2026-09-24T12:00:00.000Z");
    const fixtures = buildSeedFixtures(
      seedAccounts.map((account) => account.key),
      today,
    );

    expect(
      buildSeedFixtures(
        seedAccounts.map((account) => account.key),
        today,
      ),
    ).toEqual(fixtures);
    expect(fixtures).toHaveLength(64);

    for (const account of seedAccounts) {
      const accountFixtures = fixtures.filter((fixture) => fixture.application.userKey === account.key);
      expect(accountFixtures).toHaveLength(32);
      expect(
        accountFixtures.filter((fixture) => !fixture.application.archivedAt && !fixture.application.blacklistedAt),
      ).toHaveLength(20);
      expect(accountFixtures.filter((fixture) => fixture.application.archivedAt)).toHaveLength(6);
      expect(accountFixtures.filter((fixture) => fixture.application.blacklistedAt)).toHaveLength(6);
      expect(
        new Set(
          accountFixtures
            .filter((fixture) => fixture.application.archivedAt)
            .map((fixture) => fixture.application.status),
        ),
      ).toEqual(new Set(["saved", "applied", "interview", "offer", "rejected", "withdrawn"]));
      expect(
        new Set(
          accountFixtures
            .filter((fixture) => fixture.application.blacklistedAt)
            .map((fixture) => fixture.application.status),
        ),
      ).toEqual(new Set(["saved", "applied", "interview", "offer", "rejected", "withdrawn"]));
      expect(new Set(accountFixtures.map((fixture) => fixture.contacts.length))).toEqual(new Set([0, 1, 2, 3]));
      expect(new Set(accountFixtures.map((fixture) => fixture.followUps.length))).toEqual(new Set([0, 1, 2, 3]));
      expect(new Set(accountFixtures.map((fixture) => fixture.events.length))).toEqual(new Set([0, 1, 2, 3]));

      const minimal = accountFixtures.find((fixture) => fixture.application.company === "MINIMAL");
      expect(minimal?.application).toEqual({
        userKey: account.key,
        seedKey: `development-${account.key}-saved-minimal`,
        company: "MINIMAL",
        position: "Candidate",
        status: "saved",
        archivedAt: null,
        blacklistedAt: null,
        blacklistReason: null,
      });
      expect(minimal?.preparation).toBeNull();
      expect(minimal?.contacts).toEqual([]);
      expect(minimal?.followUps).toEqual([]);
      expect(minimal?.events).toEqual([]);

      const maxed = accountFixtures.find((fixture) => fixture.application.company === "MAXED");
      expect(maxed?.application).toMatchObject({
        status: "saved",
        location: expect.any(String),
        salary: expect.any(String),
        jobUrl: expect.any(String),
        description: expect.any(String),
        notes: expect.any(String),
      });
      expect(maxed?.preparation).toMatchObject({
        companyResearch: expect.any(String),
        talkingPoints: expect.any(String),
        interviewerQuestions: expect.any(String),
      });
      expect(maxed?.contacts).toHaveLength(3);
      expect(
        maxed?.contacts.every((contact) => contact.email && contact.phone && contact.profileUrl && contact.notes),
      ).toBe(true);
      expect(maxed?.followUps).toHaveLength(3);
      expect(maxed?.events).toHaveLength(3);
      expect(maxed?.events.every((event) => event.description)).toBe(true);
    }

    for (const fixture of fixtures) {
      expect(fixture.contacts.length).toBeGreaterThanOrEqual(0);
      expect(fixture.contacts.length).toBeLessThanOrEqual(3);
      expect(fixture.followUps.length).toBeLessThanOrEqual(3);
      expect(fixture.events.length).toBeLessThanOrEqual(3);
      expect(fixture.events.every((event) => event.occurredAt)).toBe(true);
    }
  });
});
