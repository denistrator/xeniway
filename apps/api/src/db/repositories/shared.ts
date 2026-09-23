import { and, eq } from "drizzle-orm";
import type { createDatabase } from "../client";
import { jobApplications } from "../schema";

export type Database = ReturnType<typeof createDatabase>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function ownedApplication(userId: number, id: number) {
  return and(eq(jobApplications.userId, userId), eq(jobApplications.id, id));
}
