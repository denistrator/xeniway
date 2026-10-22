import { describe, expect, test } from "vitest";
import { changeLocale, i18n } from "../../../i18n/i18n";
import { initializeTestI18n } from "../../../test/initialize-test-i18n";
import { getStatusLabel, jobStatuses } from "./job-status";

describe("job statuses", () => {
  test("defines all workflow statuses in display order", () => {
    expect(jobStatuses).toEqual(["saved", "applied", "interview", "offer", "rejected", "withdrawn"]);
  });

  test("translates canonical status values without changing their API values", async () => {
    await initializeTestI18n();
    await changeLocale("uk");

    expect(jobStatuses).toContain("interview");
    expect(getStatusLabel(i18n.getFixedT("uk"), "interview")).toBe("Співбесіда");
  });
});
