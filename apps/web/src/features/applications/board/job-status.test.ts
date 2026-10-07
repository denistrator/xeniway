import { describe, expect, test } from "vitest";
import { changeLocale, i18n, initializeI18n } from "../../../i18n/i18n";
import { getStatusLabel, jobStatuses } from "./job-status";
import { jobStatusStyles } from "./job-status-styles";

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
    const offer = jobStatusStyles({ status: "offer" });
    const columnClasses = offer.column().split(" ");
    expect(columnClasses).toContain("border-line");
    expect(columnClasses).toContain("border-t-4");
    expect(columnClasses).toContain("border-t-emerald-600");
    expect(columnClasses).toContain("dark:border-t-emerald-400");
    expect(offer.marker()).toBe("bg-emerald-600 dark:bg-emerald-400");
    expect(jobStatusStyles({ status: "saved" }).marker()).toBe("bg-slate-400 dark:bg-slate-500");
  });

  test("confines heading overrides to the workspace slot", () => {
    const styles = jobStatusStyles({ status: "offer" });
    const heading = styles.workspaceHeading({ className: "border-s-2 p-6 sm:p-8 from-accent/10" }).split(" ");

    expect(heading).toEqual(expect.arrayContaining(["border-s-2", "p-6", "sm:p-8", "from-accent/10"]));
    for (const overridden of ["border-s-4", "p-4", "sm:p-5", "from-emerald-600/8"]) {
      expect(heading).not.toContain(overridden);
    }
    expect(heading).toContain("border-s-emerald-600");
    expect(heading).toContain("dark:from-emerald-400/12");
    expect(styles.marker()).toBe("bg-emerald-600 dark:bg-emerald-400");
    expect(styles.column()).toContain("border-t-emerald-600");
  });
});
