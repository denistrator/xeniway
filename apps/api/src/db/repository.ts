import type {
  CreateApplicationInput,
  JobApplication,
  JobStatus,
  UpdateApplicationInput,
  User,
} from "@job-tracker/shared";
import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import type { createDatabase } from "./client";
import { jobApplications, sessions, users } from "./schema";

type Database = ReturnType<typeof createDatabase>;
type UserRow = typeof users.$inferSelect;
type SessionRow = typeof sessions.$inferSelect;

export interface UserRepository {
  findByEmail(email: string): Promise<UserRow | null>;
  findById(id: number): Promise<UserRow | null>;
  create(input: {
    email: string;
    passwordHash: string;
    firstName?: string | null;
    lastName?: string | null;
  }): Promise<UserRow>;
}

export interface SessionRepository {
  create(input: { id: string; userId: number | null; csrfToken: string; expiresAt: Date }): Promise<void>;
  findActive(id: string): Promise<SessionRow | null>;
  delete(id: string): Promise<void>;
  deleteExpired(): Promise<void>;
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

  async deleteExpired(): Promise<void> {
    await this.database.delete(sessions).where(lte(sessions.expiresAt, new Date()));
  }
}

export class DrizzleApplicationRepository implements ApplicationRepository {
  constructor(private readonly database: Database) {}

  async list(userId: number, options: { status?: JobStatus; archived?: boolean } = {}) {
    const conditions = [eq(jobApplications.userId, userId)];
    if (options.status) conditions.push(eq(jobApplications.status, options.status));
    conditions.push(options.archived ? isNotNull(jobApplications.archivedAt) : isNull(jobApplications.archivedAt));

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
          eq(jobApplications.userId, userId),
          eq(jobApplications.id, id),
          options.archived ? isNotNull(jobApplications.archivedAt) : isNull(jobApplications.archivedAt),
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
      .where(and(eq(jobApplications.userId, userId), eq(jobApplications.id, id), isNull(jobApplications.archivedAt)))
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
          .where(and(eq(jobApplications.userId, userId), eq(jobApplications.id, id)));
      }
      return true;
    });
  }

  async archive(userId: number, id: number): Promise<boolean> {
    const result = await this.database
      .update(jobApplications)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(jobApplications.userId, userId), eq(jobApplications.id, id), isNull(jobApplications.archivedAt)));
    return result.count > 0;
  }

  async restore(userId: number, id: number): Promise<boolean> {
    const result = await this.database
      .update(jobApplications)
      .set({ archivedAt: null, updatedAt: new Date() })
      .where(
        and(eq(jobApplications.userId, userId), eq(jobApplications.id, id), isNotNull(jobApplications.archivedAt)),
      );
    return result.count > 0;
  }

  async permanentDelete(userId: number, id: number): Promise<boolean> {
    const result = await this.database
      .delete(jobApplications)
      .where(
        and(eq(jobApplications.userId, userId), eq(jobApplications.id, id), isNotNull(jobApplications.archivedAt)),
      );
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
  };
}
