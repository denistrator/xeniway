import { describe, expect, test } from "vitest";
import { jobStatuses, statusLabels } from "./job-status";

describe("job statuses", () => {
  test("defines all workflow statuses in display order", () => {
    expect(jobStatuses).toEqual(["saved", "applied", "interview", "offer", "rejected", "withdrawn"]);
    expect(statusLabels.offer).toBe("Offer");
  });
});
