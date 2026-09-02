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
