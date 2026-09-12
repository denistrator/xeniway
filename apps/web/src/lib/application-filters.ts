import type { JobApplication } from "@xeniway/shared";

export function matchesApplicationSearch(job: JobApplication, search: string) {
  const query = search.trim().toLowerCase();
  return !query || [job.company, job.position, job.location ?? ""].some((value) => value.toLowerCase().includes(query));
}
