import type {
  ApplicationEventType,
  CreateApplicationContactInput,
  CreateApplicationFollowUpTaskInput,
  CreateApplicationInput,
  JobStatus,
} from "@xeniway/shared";
import { inArray } from "drizzle-orm";
import { createDatabase, createPostgresClient } from "./client";
import {
  applicationContacts,
  applicationEvents,
  applicationFollowUpTasks,
  applicationWorkspaces,
  jobApplications,
  userPreferences,
  users,
} from "./schema";

export const seedAccounts = [
  { key: "admin", email: "admin@example.com", firstName: "Demo", lastName: "Admin" },
  { key: "test-user", email: "test_user@example.com", firstName: "Test", lastName: "User" },
] as const;

const seedStatuses: JobStatus[] = ["saved", "applied", "interview", "offer", "rejected", "withdrawn"];

export type SeedApplication = CreateApplicationInput & {
  userKey: string;
  seedKey: string;
  archivedAt: Date | null;
  blacklistedAt: Date | null;
  blacklistReason: string | null;
};

type SeedPreparation = {
  companyResearch: string | null;
  talkingPoints: string | null;
  interviewerQuestions: string | null;
};

type SeedEvent = {
  type: ApplicationEventType;
  title: string;
  description: string | null;
  occurredAt: Date;
  metadata: null;
  isSystem: false;
};

export type SeedFixture = {
  application: SeedApplication;
  preparation: SeedPreparation | null;
  contacts: CreateApplicationContactInput[];
  followUps: Array<CreateApplicationFollowUpTaskInput & { completedAt: Date | null }>;
  events: SeedEvent[];
};

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
        archivedAt: null,
        blacklistedAt: null,
        blacklistReason: null,
      })),
    ),
  );
}

const activityExamples: Array<{ type: ApplicationEventType; title: string; description: string }> = [
  {
    type: "email_sent",
    title: "Sent a follow-up email",
    description: "Thanked the recruiter and confirmed next steps.",
  },
  {
    type: "phone_call",
    title: "Spoke with the hiring team",
    description: "Discussed the role, team structure, and timeline.",
  },
  {
    type: "interview_scheduled",
    title: "Interview scheduled",
    description: "The recruiter shared available interview times.",
  },
];

const contactExamples: CreateApplicationContactInput[] = [
  {
    name: "Jordan Lee",
    role: "Recruiter",
    email: "jordan.lee@example.com",
    phone: "+1 555 010 2040",
    profileUrl: "https://example.com/profiles/jordan-lee",
    notes: "Coordinates the hiring process and interview schedule.",
  },
  {
    name: "Morgan Patel",
    role: "Engineering Manager",
    email: "morgan.patel@example.com",
    phone: null,
    profileUrl: "https://example.com/profiles/morgan-patel",
    notes: "Potential hiring manager for the platform team.",
  },
  {
    name: "Taylor Kim",
    role: "Senior Engineer",
    email: null,
    phone: null,
    profileUrl: null,
    notes: null,
  },
];

function shiftDate(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

function timestampAt(date: Date, hour = 12): string {
  const timestamp = new Date(date);
  timestamp.setUTCHours(hour, 0, 0, 0);
  return timestamp.toISOString();
}

function buildSpecialApplication(userKey: string, name: "MINIMAL" | "MAXED"): SeedApplication {
  if (name === "MINIMAL") {
    return {
      userKey,
      seedKey: `development-${userKey}-saved-minimal`,
      company: "MINIMAL",
      position: "Candidate",
      status: "saved",
      archivedAt: null,
      blacklistedAt: null,
      blacklistReason: null,
    };
  }

  return {
    userKey,
    seedKey: `development-${userKey}-saved-maxed`,
    company: "MAXED",
    position: "Principal Platform Engineer",
    location: "Hybrid · Kyiv, Ukraine",
    salary: "$145,000–$175,000 plus equity",
    jobUrl: "https://example.com/jobs/principal-platform-engineer",
    description:
      "Lead the design of reliable developer infrastructure used by product teams across the company. Partner with security and product engineering to improve deployment safety, observability, and platform ergonomics.",
    status: "saved",
    appliedAt: null,
    notes:
      "Research the platform roadmap and prepare examples about scaling services, mentoring engineers, and improving incident response. Ask how success is measured in the first six months.",
    archivedAt: null,
    blacklistedAt: null,
    blacklistReason: null,
  };
}

function buildLifecycleApplication(
  userKey: string,
  board: "archive" | "blacklist",
  status: JobStatus,
  today: Date,
  index: number,
): SeedApplication {
  const archived = board === "archive";
  return {
    userKey,
    seedKey: `development-${userKey}-${board}-${status}`,
    company: `${archived ? "Archived" : "Blacklisted"} ${status[0].toUpperCase()}${status.slice(1)} Company`,
    position: `Candidate ${status} role`,
    location: index % 2 === 0 ? "Remote" : "Kyiv",
    salary: index % 3 === 0 ? "$90,000–$125,000" : undefined,
    jobUrl: `https://example.com/jobs/${userKey}/${board}/${status}`,
    description: `Development fixture for the ${status} ${board} workflow.`,
    status,
    appliedAt:
      status === "saved"
        ? null
        : shiftDate(today, -35 - index)
            .toISOString()
            .slice(0, 10),
    notes: `Seeded ${board} record for exploring the ${status} workflow.`,
    archivedAt: archived ? new Date(timestampAt(shiftDate(today, -14 - index))) : null,
    blacklistedAt: archived ? null : new Date(timestampAt(shiftDate(today, -10 - index))),
    blacklistReason: archived || index % 2 === 0 ? null : "Duplicate employer record.",
  };
}

function buildPreparation(index: number, specialName?: "MINIMAL" | "MAXED"): SeedPreparation | null {
  if (specialName === "MINIMAL") return null;
  if (specialName === "MAXED")
    return {
      companyResearch:
        "The company builds cloud collaboration software for distributed teams. Recent public updates describe investment in reliability, accessibility, and enterprise administration. Review its product and engineering blog before the interview.",
      talkingPoints:
        "Highlight the platform migration that reduced deploy time, the incident review process that improved recovery, and cross-team work that made service ownership clearer. Connect each example to measurable outcomes.",
      interviewerQuestions:
        "How does the team balance platform reliability work with product delivery? What would you like this hire to improve in the first six months? How are technical decisions documented across teams?",
    };
  if (index % 5 === 0) return null;
  return {
    companyResearch:
      index % 4 === 0 ? null : "Review the company's product, engineering blog, and recent team updates.",
    talkingPoints:
      index % 4 === 1 ? null : "Prepare examples of collaboration, delivery, and learning from a difficult project.",
    interviewerQuestions:
      index % 4 === 2 ? null : "Ask about the team, current priorities, and how success is measured.",
  };
}

function buildContacts(index: number, specialName?: "MINIMAL" | "MAXED"): CreateApplicationContactInput[] {
  if (specialName === "MINIMAL") return [];
  const count = specialName === "MAXED" ? 3 : index % 4;
  return contactExamples.slice(0, count).map((contact, contactIndex) => ({
    ...contact,
    ...(specialName === "MAXED"
      ? {
          email: contact.email ?? `contact${contactIndex + 1}@example.com`,
          phone: contact.phone ?? `+1 555 010 20${contactIndex + 1}`,
          profileUrl: contact.profileUrl ?? `https://example.com/profiles/contact-${contactIndex + 1}`,
          notes: contact.notes ?? "Primary contact for interview coordination.",
        }
      : {}),
  }));
}

function buildFollowUps(index: number, today: Date, specialName?: "MINIMAL" | "MAXED"): SeedFixture["followUps"] {
  if (specialName === "MINIMAL") return [];
  const count = specialName === "MAXED" ? 3 : index % 4;
  const offsets = [-3, 0, 7];
  return Array.from({ length: count }, (_, taskIndex) => ({
    title: ["Send a thank-you note", "Check in with the recruiter", "Prepare for the next interview"][taskIndex],
    dueDate: shiftDate(today, offsets[taskIndex] ?? 7)
      .toISOString()
      .slice(0, 10),
    notes:
      taskIndex === 1 || specialName === "MAXED" ? "Keep the message concise and specific to the conversation." : null,
    completedAt:
      specialName === "MAXED" && taskIndex === 1
        ? new Date(timestampAt(shiftDate(today, -1), 15))
        : specialName !== "MAXED" && (index + taskIndex) % 3 === 1
          ? new Date(timestampAt(shiftDate(today, -1), 15))
          : null,
  }));
}

function buildEvents(index: number, today: Date, specialName?: "MINIMAL" | "MAXED"): SeedEvent[] {
  if (specialName === "MINIMAL") return [];
  const count = specialName === "MAXED" ? 3 : index % 4;
  return Array.from({ length: count }, (_, eventIndex) => {
    const example = activityExamples[(index + eventIndex) % activityExamples.length];
    const descriptionPresent = specialName === "MAXED" || (index + eventIndex) % 2 === 0;
    return {
      type: example.type,
      title: example.title,
      description: descriptionPresent ? example.description : null,
      occurredAt: new Date(timestampAt(shiftDate(today, -(index + eventIndex + 1)), 9 + eventIndex)),
      metadata: null,
      isSystem: false,
    };
  });
}

export function buildSeedFixtures(userKeys: string[], today = new Date()): SeedFixture[] {
  return userKeys.flatMap((userKey) => {
    const activeApplications = buildSeedApplications([userKey]);
    const applications = [
      ...activeApplications,
      buildSpecialApplication(userKey, "MINIMAL"),
      buildSpecialApplication(userKey, "MAXED"),
      ...seedStatuses.map((status, index) => buildLifecycleApplication(userKey, "archive", status, today, index)),
      ...seedStatuses.map((status, index) => buildLifecycleApplication(userKey, "blacklist", status, today, index)),
    ];
    return applications.map((application, index) => {
      const specialName =
        application.company === "MINIMAL" || application.company === "MAXED" ? application.company : undefined;
      return {
        application,
        preparation: buildPreparation(index, specialName),
        contacts: buildContacts(index, specialName),
        followUps: buildFollowUps(index, today, specialName),
        events: buildEvents(index, today, specialName),
      };
    });
  });
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
    const fixtures = buildSeedFixtures(seedAccounts.map((account) => account.key));
    const applications = fixtures.map(({ application }) => {
      const account = seedAccounts.find((candidate) => candidate.key === application.userKey);
      const userId = account ? userIds.get(account.email) : undefined;
      if (!userId) throw new Error(`Seed account missing for ${application.userKey}`);
      const { userKey: _userKey, ...values } = application;
      return { ...values, userId };
    });

    await database.transaction(async (transaction) => {
      await transaction.delete(jobApplications).where(
        inArray(
          jobApplications.seedKey,
          applications.map((application) => application.seedKey),
        ),
      );
      const insertedApplications = await transaction
        .insert(jobApplications)
        .values(applications)
        .returning({ id: jobApplications.id, userId: jobApplications.userId, seedKey: jobApplications.seedKey });
      const insertedBySeedKey = new Map(insertedApplications.map((application) => [application.seedKey, application]));

      const workspaceRows = fixtures.flatMap((fixture) => {
        const inserted = insertedBySeedKey.get(fixture.application.seedKey);
        return fixture.preparation && inserted
          ? [{ applicationId: inserted.id, userId: inserted.userId, ...fixture.preparation }]
          : [];
      });
      if (workspaceRows.length) await transaction.insert(applicationWorkspaces).values(workspaceRows);

      const contactRows = fixtures.flatMap((fixture) => {
        const inserted = insertedBySeedKey.get(fixture.application.seedKey);
        return inserted
          ? fixture.contacts.map((contact) => ({ ...contact, applicationId: inserted.id, userId: inserted.userId }))
          : [];
      });
      if (contactRows.length) await transaction.insert(applicationContacts).values(contactRows);

      const followUpRows = fixtures.flatMap((fixture) => {
        const inserted = insertedBySeedKey.get(fixture.application.seedKey);
        return inserted
          ? fixture.followUps.map((followUp) => ({ ...followUp, applicationId: inserted.id, userId: inserted.userId }))
          : [];
      });
      if (followUpRows.length) await transaction.insert(applicationFollowUpTasks).values(followUpRows);

      const eventRows = fixtures.flatMap((fixture) => {
        const inserted = insertedBySeedKey.get(fixture.application.seedKey);
        return inserted
          ? fixture.events.map((event) => ({ ...event, applicationId: inserted.id, userId: inserted.userId }))
          : [];
      });
      if (eventRows.length) await transaction.insert(applicationEvents).values(eventRows);
    });
  } finally {
    await client.end();
  }
}

if (import.meta.main) await seed();
