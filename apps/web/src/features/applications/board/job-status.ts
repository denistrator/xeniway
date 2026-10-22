import type { JobStatus } from "@xeniway/shared";
import type { TFunction } from "i18next";

export const jobStatuses: JobStatus[] = ["saved", "applied", "interview", "offer", "rejected", "withdrawn"];

export function getDisplayedStatuses(visibleStatuses: readonly JobStatus[]) {
  return jobStatuses.filter((status) => visibleStatuses.includes(status));
}

export function getStatusLabel(t: TFunction, status: JobStatus) {
  return t(`applications.status.${status}`);
}
