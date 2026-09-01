import { describe, expect, it } from "vitest";
import { buildSeedApplications, seedAccounts } from "./seed";

describe("development seed", () => {
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
