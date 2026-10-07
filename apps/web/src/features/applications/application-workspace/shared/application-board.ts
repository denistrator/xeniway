import type { JobApplication } from "@xeniway/shared";

export type ApplicationBoard = "active" | "archive" | "blacklist";

export function getApplicationBoard(application: JobApplication): ApplicationBoard {
  if (application.blacklistedAt) {
    return "blacklist";
  }
  if (application.archivedAt) {
    return "archive";
  }
  return "active";
}
