import type { JobApplication } from "@xeniway/shared";
import { jobStatuses } from "../../board/job-status";

export function getApplicationNeighbors(
  applications: ReadonlyArray<Pick<JobApplication, "id" | "status">>,
  currentId: number,
): { previous: number | null; next: number | null } {
  const ordered = jobStatuses.flatMap((status) => applications.filter((application) => application.status === status));
  const index = ordered.findIndex((application) => application.id === currentId);
  if (index < 0 || ordered.length < 2) return { previous: null, next: null };

  return {
    previous: ordered[(index + ordered.length - 1) % ordered.length].id,
    next: ordered[(index + 1) % ordered.length].id,
  };
}
