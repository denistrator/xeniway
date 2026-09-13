import { describe, expect, it } from "vitest";
import { assertDevelopmentSeedAllowed, buildSeedApplications, seedAccounts } from "./seed";

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
});
