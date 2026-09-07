import type { JobStatus } from "@job-tracker/shared";

export const jobStatuses: JobStatus[] = ["saved", "applied", "interview", "offer", "rejected", "withdrawn"];

export const statusLabels: Record<JobStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const statusStyles: Record<JobStatus, { column: string; card: string }> = {
  saved: {
    column: "border-t-slate-400 dark:border-t-slate-500",
    card: "border-l-slate-400 dark:border-l-slate-500",
  },
  applied: { column: "border-t-accent", card: "border-l-accent" },
  interview: {
    column: "border-t-sky-600 dark:border-t-sky-400",
    card: "border-l-sky-600 dark:border-l-sky-400",
  },
  offer: {
    column: "border-t-emerald-600 dark:border-t-emerald-400",
    card: "border-l-emerald-600 dark:border-l-emerald-400",
  },
  rejected: { column: "border-t-accent-warm", card: "border-l-accent-warm" },
  withdrawn: {
    column: "border-t-violet-500 dark:border-t-violet-400",
    card: "border-l-violet-500 dark:border-l-violet-400",
  },
};
