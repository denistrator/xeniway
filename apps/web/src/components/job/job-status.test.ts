import { describe, expect, test } from "vitest";
import { changeLocale, i18n, initializeI18n } from "../../i18n/i18n";
import { getStatusLabel, jobStatuses, statusStyles } from "./job-status";

describe("job statuses", () => {
  test("defines all workflow statuses in display order", () => {
    expect(jobStatuses).toEqual(["saved", "applied", "interview", "offer", "rejected", "withdrawn"]);
  });

  test("translates canonical status values without changing their API values", async () => {
    await initializeI18n();
    await changeLocale("uk");

    expect(jobStatuses).toContain("interview");
    expect(getStatusLabel(i18n.getFixedT("uk"), "interview")).toBe("Співбесіда");
  });

  test("defines matching column and marker decoration classes", () => {
    expect(statusStyles.offer).toEqual({
      column: "border-t-emerald-600 dark:border-t-emerald-400",
      marker: "bg-emerald-600 dark:bg-emerald-400",
    });
    expect(statusStyles.saved.marker).toBe("bg-slate-400 dark:bg-slate-500");
  });
});
