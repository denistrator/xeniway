import type { JobStatus } from "@xeniway/shared";
import { tv } from "tailwind-variants";

export const jobStatusStyles = tv({
  slots: {
    column: "job-board-column min-h-64 rounded-2xl border border-line border-t-4 bg-surface-tint p-3 md:min-w-64",
    marker: "",
    workspace: "workspace-status-decor",
    workspaceHeading:
      "grid min-w-0 gap-2 rounded-2xl border-s-4 bg-linear-to-r to-transparent p-4 sm:p-5 rtl:bg-linear-to-l",
  },
  variants: {
    status: {
      saved: {
        workspace:
          "[--workspace-status-color:var(--color-slate-400)] dark:[--workspace-status-color:var(--color-slate-500)]",
        column: "border-t-slate-400 dark:border-t-slate-500",
        marker: "bg-slate-400 dark:bg-slate-500",
        workspaceHeading: "border-s-slate-400 from-slate-400/8 dark:border-s-slate-500 dark:from-slate-500/12",
      },
      applied: {
        workspace: "[--workspace-status-color:var(--theme-accent)]",
        column: "border-t-accent",
        marker: "bg-accent",
        workspaceHeading: "border-s-accent from-accent/8 dark:from-accent/12",
      },
      interview: {
        workspace:
          "[--workspace-status-color:var(--color-sky-600)] dark:[--workspace-status-color:var(--color-sky-400)]",
        column: "border-t-sky-600 dark:border-t-sky-400",
        marker: "bg-sky-600 dark:bg-sky-400",
        workspaceHeading: "border-s-sky-600 from-sky-600/8 dark:border-s-sky-400 dark:from-sky-400/12",
      },
      offer: {
        workspace:
          "[--workspace-status-color:var(--color-emerald-600)] dark:[--workspace-status-color:var(--color-emerald-400)]",
        column: "border-t-emerald-600 dark:border-t-emerald-400",
        marker: "bg-emerald-600 dark:bg-emerald-400",
        workspaceHeading: "border-s-emerald-600 from-emerald-600/8 dark:border-s-emerald-400 dark:from-emerald-400/12",
      },
      rejected: {
        workspace: "[--workspace-status-color:var(--theme-accent-warm)]",
        column: "border-t-accent-warm",
        marker: "bg-accent-warm",
        workspaceHeading: "border-s-accent-warm from-accent-warm/8 dark:from-accent-warm/12",
      },
      withdrawn: {
        workspace:
          "[--workspace-status-color:var(--color-violet-500)] dark:[--workspace-status-color:var(--color-violet-400)]",
        column: "border-t-violet-500 dark:border-t-violet-400",
        marker: "bg-violet-500 dark:bg-violet-400",
        workspaceHeading: "border-s-violet-500 from-violet-500/8 dark:border-s-violet-400 dark:from-violet-400/12",
      },
    } satisfies Record<JobStatus, { column: string; marker: string; workspace: string; workspaceHeading: string }>,
  },
});
