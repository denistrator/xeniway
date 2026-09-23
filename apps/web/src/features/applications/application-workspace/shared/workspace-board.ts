import type { JobApplication } from "@xeniway/shared";

export function getWorkspaceBoard(application: JobApplication): "active" | "archive" | "blacklist" {
  if (application.blacklistedAt) return "blacklist";
  if (application.archivedAt) return "archive";
  return "active";
}

export function parseApplicationId(value: string | undefined): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
