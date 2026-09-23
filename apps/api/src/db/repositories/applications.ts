import type {
  ApplicationBoard,
  ApplicationEvent,
  ApplicationEventInput,
  ApplicationEventType,
  BlacklistInput,
  CreateApplicationInput,
  JobApplication,
  JobStatus,
  UpdateApplicationEventInput,
  UpdateApplicationInput,
} from "@xeniway/shared";
import { and, asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { applicationEvents, jobApplications } from "../schema";
import { toApplicationEvent, toJobApplication } from "./mappers";
import type { Database, Transaction } from "./shared";
import { ownedApplication } from "./shared";
import type { ApplicationRepository } from "./types";
export class DrizzleApplicationRepository implements ApplicationRepository {
  constructor(private readonly database: Database) {}

  private async recordSystemEvent(
    transaction: Transaction,
    userId: number,
    applicationId: number,
    type: ApplicationEventType,
    metadata: { from: JobStatus; to: JobStatus } | null = null,
  ): Promise<void> {
    await transaction.insert(applicationEvents).values({
      userId,
      applicationId,
      type,
      title: type.replaceAll("_", " "),
      occurredAt: new Date(),
      metadata,
      isSystem: true,
    });
  }

  async listEvents(userId: number, applicationId: number): Promise<ApplicationEvent[]> {
    const rows = await this.database
      .select()
      .from(applicationEvents)
      .where(and(eq(applicationEvents.userId, userId), eq(applicationEvents.applicationId, applicationId)))
      .orderBy(desc(applicationEvents.occurredAt), desc(applicationEvents.id));
    return rows.map(toApplicationEvent);
  }

  async createEvent(
    userId: number,
    applicationId: number,
    input: ApplicationEventInput,
  ): Promise<ApplicationEvent | null> {
    return this.database.transaction(async (transaction) => {
      const [application] = await transaction
        .select({ id: jobApplications.id })
        .from(jobApplications)
        .where(ownedApplication(userId, applicationId))
        .for("share")
        .limit(1);
      if (!application) return null;
      const [row] = await transaction
        .insert(applicationEvents)
        .values({
          userId,
          applicationId,
          type: input.type,
          title: input.title,
          description: input.description ?? null,
          occurredAt: new Date(input.occurredAt),
          metadata: null,
          isSystem: false,
        })
        .returning();
      if (!row) throw new Error("Unable to create application event");
      return toApplicationEvent(row);
    });
  }

  async updateEvent(
    userId: number,
    applicationId: number,
    eventId: number,
    input: UpdateApplicationEventInput,
  ): Promise<ApplicationEvent | null> {
    const [row] = await this.database
      .update(applicationEvents)
      .set({
        ...input,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(applicationEvents.userId, userId),
          eq(applicationEvents.applicationId, applicationId),
          eq(applicationEvents.id, eventId),
          eq(applicationEvents.isSystem, false),
        ),
      )
      .returning();
    return row ? toApplicationEvent(row) : null;
  }

  async deleteEvent(userId: number, applicationId: number, eventId: number): Promise<boolean> {
    const result = await this.database
      .delete(applicationEvents)
      .where(
        and(
          eq(applicationEvents.userId, userId),
          eq(applicationEvents.applicationId, applicationId),
          eq(applicationEvents.id, eventId),
          eq(applicationEvents.isSystem, false),
        ),
      );
    return result.count > 0;
  }

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

  async findById(userId: number, id: number, options: { archived?: boolean; anyState?: boolean } = {}) {
    const [row] = await this.database
      .select()
      .from(jobApplications)
      .where(
        and(
          ownedApplication(userId, id),
          ...(options.anyState
            ? []
            : [
                options.archived ? isNotNull(jobApplications.archivedAt) : isNull(jobApplications.archivedAt),
                isNull(jobApplications.blacklistedAt),
              ]),
        ),
      )
      .limit(1);
    return row ? toJobApplication(row) : null;
  }

  async create(userId: number, input: CreateApplicationInput): Promise<JobApplication> {
    return this.database.transaction(async (transaction) => {
      const [row] = await transaction
        .insert(jobApplications)
        .values({ ...input, userId })
        .returning();
      if (!row) throw new Error("Unable to create application");
      await this.recordSystemEvent(transaction, userId, row.id, "application_created");
      return toJobApplication(row);
    });
  }

  async update(userId: number, id: number, input: UpdateApplicationInput): Promise<JobApplication | null> {
    return this.database.transaction(async (transaction) => {
      const [before] = await transaction
        .select()
        .from(jobApplications)
        .where(and(ownedApplication(userId, id), isNull(jobApplications.archivedAt)))
        .for("update")
        .limit(1);
      if (!before) return null;
      const [row] = await transaction
        .update(jobApplications)
        .set({ ...input, updatedAt: new Date() })
        .where(ownedApplication(userId, id))
        .returning();
      if (!row) return null;
      if (row.status !== before.status) {
        await this.recordSystemEvent(transaction, userId, id, "status_changed", {
          from: before.status,
          to: row.status,
        });
      }
      const fieldsChanged = Object.entries(input).some(
        ([key, value]) => key !== "status" && value !== undefined && before[key as keyof typeof before] !== value,
      );
      if (fieldsChanged) await this.recordSystemEvent(transaction, userId, id, "application_edited");
      return toJobApplication(row);
    });
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
    return this.database.transaction(async (transaction) => {
      const [row] = await transaction
        .update(jobApplications)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(and(ownedApplication(userId, id), isNull(jobApplications.archivedAt)))
        .returning({ id: jobApplications.id });
      if (!row) return false;
      await this.recordSystemEvent(transaction, userId, id, "archived");
      return true;
    });
  }

  async restore(userId: number, id: number): Promise<boolean> {
    return this.database.transaction(async (transaction) => {
      const [row] = await transaction
        .update(jobApplications)
        .set({ archivedAt: null, updatedAt: new Date() })
        .where(and(ownedApplication(userId, id), isNotNull(jobApplications.archivedAt)))
        .returning({ id: jobApplications.id });
      if (!row) return false;
      await this.recordSystemEvent(transaction, userId, id, "restored_from_archive");
      return true;
    });
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
    return this.database.transaction(async (transaction) => {
      const [row] = await transaction
        .update(jobApplications)
        .set({ blacklistedAt: new Date(), blacklistReason: reason ?? null, updatedAt: new Date() })
        .where(
          and(ownedApplication(userId, id), isNull(jobApplications.archivedAt), isNull(jobApplications.blacklistedAt)),
        )
        .returning({ id: jobApplications.id });
      if (!row) return false;
      await this.recordSystemEvent(transaction, userId, id, "blacklisted");
      return true;
    });
  }

  async unblacklist(userId: number, id: number): Promise<boolean> {
    return this.database.transaction(async (transaction) => {
      const [row] = await transaction
        .update(jobApplications)
        .set({ blacklistedAt: null, blacklistReason: null, updatedAt: new Date() })
        .where(and(ownedApplication(userId, id), isNotNull(jobApplications.blacklistedAt)))
        .returning({ id: jobApplications.id });
      if (!row) return false;
      await this.recordSystemEvent(transaction, userId, id, "restored_from_blacklist");
      return true;
    });
  }
}
