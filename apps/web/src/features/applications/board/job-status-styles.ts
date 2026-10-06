import type { JobStatus } from "@xeniway/shared";
import { tv } from "tailwind-variants";

export const jobStatusStyles = tv({
  slots: {
    column: "job-board-column min-h-64 rounded-2xl border border-line border-t-4 bg-surface-tint p-3 md:min-w-64",
    marker: "",
  },
  variants: {
    status: {
      saved: { column: "border-t-slate-400 dark:border-t-slate-500", marker: "bg-slate-400 dark:bg-slate-500" },
      applied: { column: "border-t-accent", marker: "bg-accent" },
      interview: { column: "border-t-sky-600 dark:border-t-sky-400", marker: "bg-sky-600 dark:bg-sky-400" },
      offer: { column: "border-t-emerald-600 dark:border-t-emerald-400", marker: "bg-emerald-600 dark:bg-emerald-400" },
      rejected: { column: "border-t-accent-warm", marker: "bg-accent-warm" },
      withdrawn: { column: "border-t-violet-500 dark:border-t-violet-400", marker: "bg-violet-500 dark:bg-violet-400" },
    } satisfies Record<JobStatus, { column: string; marker: string }>,
  },
});
