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

export const statusAccentClasses: Record<JobStatus, string> = {
  saved: "border-t-slate-400 dark:border-t-slate-500",
  applied: "border-t-accent",
  interview: "border-t-sky-600 dark:border-t-sky-400",
  offer: "border-t-emerald-600 dark:border-t-emerald-400",
  rejected: "border-t-accent-warm",
  withdrawn: "border-t-violet-500 dark:border-t-violet-400",
};
