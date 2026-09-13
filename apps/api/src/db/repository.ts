import {
  type ApplicationBoard,
  type BlacklistInput,
  type CreateApplicationInput,
  formPresentationSchema,
  type JobApplication,
  type JobStatus,
  supportedLocaleSchema,
  themePreferenceSchema,
  type UpdateApplicationInput,
  type UpdateUserPreferencesInput,
  type User,
  type UserPreferences,
} from "@xeniway/shared";
import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import type { createDatabase } from "./client";
import { jobApplications, passwordResetTokens, sessions, userPreferences, users } from "./schema";

type Database = ReturnType<typeof createDatabase>;
type UserRow = typeof users.$inferSelect;
type SessionRow = typeof sessions.$inferSelect;
type UserPreferencesRow = typeof userPreferences.$inferSelect;

function ownedApplication(userId: number, id: number) {
  return and(eq(jobApplications.userId, userId), eq(jobApplications.id, id));
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRow | null>;
  findById(id: number): Promise<UserRow | null>;
  create(input: {
    email: string;
    passwordHash: string;
    firstName?: string | null;
    lastName?: string | null;
  }): Promise<UserRow>;
  updatePasswordHash(id: number, passwordHash: string): Promise<boolean>;
}

export interface SessionRepository {
  create(input: { id: string; userId: number | null; csrfToken: string; expiresAt: Date }): Promise<void>;
  findActive(id: string): Promise<SessionRow | null>;
  delete(id: string): Promise<void>;
  deleteForUser(userId: number): Promise<void>;
  deleteExpired(): Promise<void>;
}

export interface UserPreferencesRepository {
  findByUserId(userId: number): Promise<UserPreferencesRow | null>;
  update(userId: number, input: UpdateUserPreferencesInput): Promise<UserPreferencesRow>;
  markIntroduced(userId: number): Promise<UserPreferencesRow>;
}

export interface PasswordResetTokenRepository {
  invalidateForUser(userId: number): Promise<void>;
  create(input: { userId: number; tokenHash: string; expiresAt: Date }): Promise<void>;
  consume(tokenHash: string, now?: Date): Promise<{ userId: number } | null>;
}

export interface ApplicationRepository {
  list(userId: number, options?: { status?: JobStatus; archived?: boolean }): Promise<JobApplication[]>;
  findById(userId: number, id: number, options?: { archived?: boolean }): Promise<JobApplication | null>;
  create(userId: number, input: CreateApplicationInput): Promise<JobApplication>;
  update(userId: number, id: number, input: UpdateApplicationInput): Promise<JobApplication | null>;
  reorder(userId: number, status: JobStatus, applicationIds: number[]): Promise<boolean>;
  archive(userId: number, id: number): Promise<boolean>;
  restore(userId: number, id: number): Promise<boolean>;
  permanentDelete(userId: number, id: number): Promise<boolean>;
  removeAll(userId: number, board: ApplicationBoard): Promise<number>;
  listBlacklisted(userId: number): Promise<JobApplication[]>;
  blacklist(userId: number, id: number, reason: BlacklistInput["reason"]): Promise<boolean>;
  unblacklist(userId: number, id: number): Promise<boolean>;
}

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly database: Database) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    const [row] = await this.database.select().from(users).where(eq(users.email, email)).limit(1);
    return row ?? null;
  }

  async findById(id: number): Promise<UserRow | null> {
    const [row] = await this.database.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  async create(input: {
    email: string;
    passwordHash: string;
    firstName?: string | null;
    lastName?: string | null;
  }): Promise<UserRow> {
    const [row] = await this.database.insert(users).values(input).returning();
    if (!row) throw new Error("Unable to create user");
    return row;
  }

  async updatePasswordHash(id: number, passwordHash: string): Promise<boolean> {
    const result = await this.database.update(users).set({ passwordHash }).where(eq(users.id, id));
    return result.count > 0;
  }
}

export class DrizzleSessionRepository implements SessionRepository {
  constructor(private readonly database: Database) {}

  async create(input: { id: string; userId: number | null; csrfToken: string; expiresAt: Date }): Promise<void> {
    await this.database.insert(sessions).values(input);
  }

  async findActive(id: string): Promise<SessionRow | null> {
    const [row] = await this.database
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
      .limit(1);
    return row ?? null;
  }

  async delete(id: string): Promise<void> {
    await this.database.delete(sessions).where(eq(sessions.id, id));
  }

  async deleteForUser(userId: number): Promise<void> {
    await this.database.delete(sessions).where(eq(sessions.userId, userId));
  }

  async deleteExpired(): Promise<void> {
    await this.database.delete(sessions).where(lte(sessions.expiresAt, new Date()));
  }
}

export class DrizzleUserPreferencesRepository implements UserPreferencesRepository {
  constructor(private readonly database: Database) {}

  async findByUserId(userId: number): Promise<UserPreferencesRow | null> {
    const [row] = await this.database.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
    return row ?? null;
  }

  async update(userId: number, input: UpdateUserPreferencesInput): Promise<UserPreferencesRow> {
    const values = { userId, ...input };
    const [row] = await this.database
      .insert(userPreferences)
      .values(values)
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();
    if (!row) throw new Error("Unable to update user preferences");
    return row;
  }

  async markIntroduced(userId: number): Promise<UserPreferencesRow> {
    const [row] = await this.database
      .insert(userPreferences)
      .values({ userId, wasIntroduced: true })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { wasIntroduced: true, updatedAt: new Date() },
      })
      .returning();
    if (!row) throw new Error("Unable to update user preferences");
    return row;
  }
}

export class DrizzlePasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly database: Database) {}

  async invalidateForUser(userId: number): Promise<void> {
    await this.database
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
  }

  async create(input: { userId: number; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.database.insert(passwordResetTokens).values(input);
  }

  async consume(tokenHash: string, now = new Date()): Promise<{ userId: number } | null> {
    const [row] = await this.database
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .returning({ userId: passwordResetTokens.userId });
    return row ?? null;
  }
}

export class DrizzleApplicationRepository implements ApplicationRepository {
  constructor(private readonly database: Database) {}

  async list(userId: number, options: { status?: JobStatus; archived?: boolean } = {}) {
    const conditions = [eq(jobApplications.userId, userId)];
    if (options.status) conditions.push(eq(jobApplications.status, options.status));
    conditions.push(options.archived ? isNotNull(jobApplications.archivedAt) : isNull(jobApplications.archivedAt));
    conditions.push(isNull(jobApplications.blacklistedAt));

    const rows = await this.database
      .select()
      .from(jobApplications)
      .where(and(...conditions))
      .orderBy(
        asc(jobApplications.sortOrder),
        desc(options.archived ? jobApplications.archivedAt : jobApplications.createdAt),
      );
    return rows.map(toJobApplication);
  }

  async findById(userId: number, id: number, options: { archived?: boolean } = {}) {
    const [row] = await this.database
      .select()
      .from(jobApplications)
      .where(
        and(
          ownedApplication(userId, id),
          options.archived ? isNotNull(jobApplications.archivedAt) : isNull(jobApplications.archivedAt),
          isNull(jobApplications.blacklistedAt),
        ),
      )
      .limit(1);
    return row ? toJobApplication(row) : null;
  }

  async create(userId: number, input: CreateApplicationInput): Promise<JobApplication> {
    const [row] = await this.database
      .insert(jobApplications)
      .values({ ...input, userId })
      .returning();
    if (!row) throw new Error("Unable to create application");
    return toJobApplication(row);
  }

  async update(userId: number, id: number, input: UpdateApplicationInput): Promise<JobApplication | null> {
    const [row] = await this.database
      .update(jobApplications)
      .set({ ...input, updatedAt: new Date() })
      .where(and(ownedApplication(userId, id), isNull(jobApplications.archivedAt)))
      .returning();
    return row ? toJobApplication(row) : null;
  }

  async reorder(userId: number, status: JobStatus, applicationIds: number[]): Promise<boolean> {
    return this.database.transaction(async (transaction) => {
      const rows = await transaction
        .select({ id: jobApplications.id })
        .from(jobApplications)
        .where(
          and(
            eq(jobApplications.userId, userId),
            eq(jobApplications.status, status),
            isNull(jobApplications.archivedAt),
            inArray(jobApplications.id, applicationIds),
          ),
        );
      if (rows.length !== applicationIds.length) return false;
      for (const [sortOrder, id] of applicationIds.entries()) {
        await transaction
          .update(jobApplications)
          .set({ sortOrder, updatedAt: new Date() })
          .where(ownedApplication(userId, id));
      }
      return true;
    });
  }

  async archive(userId: number, id: number): Promise<boolean> {
    const result = await this.database
      .update(jobApplications)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(and(ownedApplication(userId, id), isNull(jobApplications.archivedAt)));
    return result.count > 0;
  }

  async restore(userId: number, id: number): Promise<boolean> {
    const result = await this.database
      .update(jobApplications)
      .set({ archivedAt: null, updatedAt: new Date() })
      .where(and(ownedApplication(userId, id), isNotNull(jobApplications.archivedAt)));
    return result.count > 0;
  }

  async permanentDelete(userId: number, id: number): Promise<boolean> {
    const result = await this.database.delete(jobApplications).where(ownedApplication(userId, id));
    return result.count > 0;
  }

  async removeAll(userId: number, board: ApplicationBoard): Promise<number> {
    const boardFilter =
      board === "archive"
        ? isNotNull(jobApplications.archivedAt)
        : board === "blacklist"
          ? isNotNull(jobApplications.blacklistedAt)
          : and(isNull(jobApplications.archivedAt), isNull(jobApplications.blacklistedAt));
    const result = await this.database
      .delete(jobApplications)
      .where(and(eq(jobApplications.userId, userId), boardFilter));
    return result.count;
  }

  async listBlacklisted(userId: number): Promise<JobApplication[]> {
    const rows = await this.database
      .select()
      .from(jobApplications)
      .where(and(eq(jobApplications.userId, userId), isNotNull(jobApplications.blacklistedAt)))
      .orderBy(desc(jobApplications.blacklistedAt), asc(jobApplications.sortOrder));
    return rows.map(toJobApplication);
  }

  async blacklist(userId: number, id: number, reason: BlacklistInput["reason"]): Promise<boolean> {
    const result = await this.database
      .update(jobApplications)
      .set({ blacklistedAt: new Date(), blacklistReason: reason ?? null, updatedAt: new Date() })
      .where(
        and(ownedApplication(userId, id), isNull(jobApplications.archivedAt), isNull(jobApplications.blacklistedAt)),
      );
    return result.count > 0;
  }

  async unblacklist(userId: number, id: number): Promise<boolean> {
    const result = await this.database
      .update(jobApplications)
      .set({ blacklistedAt: null, blacklistReason: null, updatedAt: new Date() })
      .where(and(ownedApplication(userId, id), isNotNull(jobApplications.blacklistedAt)));
    return result.count > 0;
  }
}

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toUserPreferences(row: UserPreferencesRow): UserPreferences {
  return {
    wasIntroduced: row.wasIntroduced,
    selectedLanguage: row.selectedLanguage ? supportedLocaleSchema.parse(row.selectedLanguage) : null,
    selectedTheme: row.selectedTheme ? themePreferenceSchema.parse(row.selectedTheme) : null,
    selectedFormPresentation: row.selectedFormPresentation
      ? formPresentationSchema.parse(row.selectedFormPresentation)
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toJobApplication(row: typeof jobApplications.$inferSelect): JobApplication {
  return {
    id: row.id,
    company: row.company,
    position: row.position,
    location: row.location,
    salary: row.salary,
    jobUrl: row.jobUrl,
    description: row.description,
    status: row.status,
    sortOrder: row.sortOrder,
    appliedAt: row.appliedAt,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() ?? null,
    blacklistedAt: row.blacklistedAt?.toISOString() ?? null,
    blacklistReason: row.blacklistReason,
  };
}
