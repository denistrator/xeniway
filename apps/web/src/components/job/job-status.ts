import type { JobStatus } from "@xeniway/shared";
import type { TFunction } from "i18next";

export const jobStatuses: JobStatus[] = ["saved", "applied", "interview", "offer", "rejected", "withdrawn"];

export function getStatusLabel(t: TFunction, status: JobStatus) {
  return t(`applications.status.${status}`);
}

// Transitional export for workspace components that are localized in the next migration step.
export const statusStyles: Record<JobStatus, { column: string; marker: string }> = {
  saved: {
    column: "border-t-slate-400 dark:border-t-slate-500",
    marker: "bg-slate-400 dark:bg-slate-500",
  },
  applied: { column: "border-t-accent", marker: "bg-accent" },
  interview: {
    column: "border-t-sky-600 dark:border-t-sky-400",
    marker: "bg-sky-600 dark:bg-sky-400",
  },
  offer: {
    column: "border-t-emerald-600 dark:border-t-emerald-400",
    marker: "bg-emerald-600 dark:bg-emerald-400",
  },
  rejected: { column: "border-t-accent-warm", marker: "bg-accent-warm" },
  withdrawn: {
    column: "border-t-violet-500 dark:border-t-violet-400",
    marker: "bg-violet-500 dark:bg-violet-400",
  },
};
