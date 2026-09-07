import { describe, expect, test } from "vitest";
import { jobStatuses, statusLabels, statusStyles } from "./job-status";

describe("job statuses", () => {
  test("defines all workflow statuses in display order", () => {
    expect(jobStatuses).toEqual(["saved", "applied", "interview", "offer", "rejected", "withdrawn"]);
    expect(statusLabels.offer).toBe("Offer");
  });

  test("defines matching column and card decoration classes", () => {
    expect(statusStyles.offer).toEqual({
      column: "border-t-emerald-600 dark:border-t-emerald-400",
      card: "border-l-emerald-600 dark:border-l-emerald-400",
    });
    expect(statusStyles.saved.card).toBe("border-l-slate-400 dark:border-l-slate-500");
  });
});
