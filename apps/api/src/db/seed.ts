import type { CreateApplicationInput, JobStatus } from "@xeniway/shared";
import { inArray } from "drizzle-orm";
import { createDatabase, createPostgresClient } from "./client";
import { jobApplications, userPreferences, users } from "./schema";

export const seedAccounts = [
  { key: "admin", email: "admin@example.com", firstName: "Demo", lastName: "Admin" },
  { key: "test-user", email: "test_user@example.com", firstName: "Test", lastName: "User" },
] as const;

const seedStatuses: JobStatus[] = ["saved", "applied", "interview", "offer", "rejected", "withdrawn"];

export type SeedApplication = CreateApplicationInput & { userKey: string; seedKey: string };

type SeedEnvironment = {
  databaseUrl: string;
  nodeEnv?: string;
  allowDevelopmentSeed?: string;
};

export function assertDevelopmentSeedAllowed(environment: SeedEnvironment): void {
  if (environment.nodeEnv === "production") {
    throw new Error("Development seed is disabled in production");
  }
  if (environment.allowDevelopmentSeed !== "true") {
    throw new Error("ALLOW_DEVELOPMENT_SEED=true is required to load development fixtures");
  }

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(environment.databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid URL");
  }
  if (databaseUrl.protocol !== "postgres:" && databaseUrl.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use postgres: or postgresql:");
  }
  const hostname = databaseUrl.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname !== "localhost" && hostname !== "::1" && !/^127\./.test(hostname)) {
    throw new Error("Development seed requires a local PostgreSQL host");
  }
}

export function buildSeedApplications(userKeys: string[]): SeedApplication[] {
  return userKeys.flatMap((userKey) =>
    seedStatuses.flatMap((status) =>
      [1, 2, 3].map((number) => ({
        userKey,
        seedKey: `development-${userKey}-${status}-${number}`,
        company: `${status[0].toUpperCase()}${status.slice(1)} Company ${number}`,
        position: `Candidate ${status} role ${number}`,
        location: number === 1 ? "Remote" : "Kyiv",
        salary: "$80,000 - $120,000",
        jobUrl: `https://example.com/jobs/${userKey}/${status}/${number}`,
        description: `Development fixture for the ${status} workflow state.`,
        status,
        appliedAt: status === "saved" ? null : `2026-08-${String(10 + number).padStart(2, "0")}`,
        notes: "Development-only fixture data.",
      })),
    ),
  );
}

async function seed(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  assertDevelopmentSeedAllowed({
    databaseUrl,
    nodeEnv: process.env.NODE_ENV,
    allowDevelopmentSeed: process.env.ALLOW_DEVELOPMENT_SEED,
  });

  const client = createPostgresClient(databaseUrl);
  const database = createDatabase(client);
  try {
    const passwordHash = await Bun.password.hash("password", { algorithm: "argon2id" });
    const accountRows = await database
      .insert(users)
      .values(seedAccounts.map((account) => ({ ...account, passwordHash })))
      .onConflictDoUpdate({
        target: users.email,
        set: { passwordHash, firstName: "Development", lastName: "User" },
      })
      .returning({ id: users.id, email: users.email });
    const userIds = new Map(accountRows.map((account) => [account.email, account.id]));
    await database
      .insert(userPreferences)
      .values(
        accountRows.map(({ id }) => ({
          userId: id,
          wasIntroduced: false,
          selectedLanguage: null,
          selectedTheme: null,
          selectedFormPresentation: null,
        })),
      )
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          wasIntroduced: false,
          selectedLanguage: null,
          selectedTheme: null,
          selectedFormPresentation: null,
          updatedAt: new Date(),
        },
      });
    const applications = buildSeedApplications(seedAccounts.map((account) => account.key)).map((application) => {
      const account = seedAccounts.find((candidate) => candidate.key === application.userKey);
      const userId = account ? userIds.get(account.email) : undefined;
      if (!userId) throw new Error(`Seed account missing for ${application.userKey}`);
      const { userKey: _userKey, ...input } = application;
      return { ...input, userId };
    });
    await database.delete(jobApplications).where(
      inArray(
        jobApplications.seedKey,
        applications.map((application) => application.seedKey),
      ),
    );
    await database.insert(jobApplications).values(applications);
  } finally {
    await client.end();
  }
}

if (import.meta.main) await seed();
