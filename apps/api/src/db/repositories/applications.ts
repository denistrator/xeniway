import type {
  ApplicationBoard,
  ApplicationContact,
  ApplicationEvent,
  ApplicationEventInput,
  ApplicationEventType,
  ApplicationFollowUpTask,
  ApplicationPreparation,
  BlacklistInput,
  CreateApplicationContactInput,
  CreateApplicationFollowUpTaskInput,
  CreateApplicationInput,
  JobApplication,
  JobStatus,
  UpdateApplicationContactInput,
  UpdateApplicationEventInput,
  UpdateApplicationFollowUpTaskInput,
  UpdateApplicationInput,
  UpdateApplicationPreparationInput,
} from "@xeniway/shared";
import { and, asc, desc, eq, exists, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { withApplicationCreationEvent } from "../../application-history";
import {
  applicationContacts,
  applicationEvents,
  applicationFollowUpTasks,
  applicationWorkspaces,
  jobApplications,
} from "../schema";
import {
  toApplicationContact,
  toApplicationEvent,
  toApplicationFollowUpTask,
  toApplicationPreparation,
  toJobApplication,
} from "./mappers";
import type { Database, Transaction } from "./shared";
import { ownedApplication } from "./shared";
import type { ApplicationExportRecord, ApplicationRepository, ApplicationWorkspaceData } from "./types";
export class DrizzleApplicationRepository implements ApplicationRepository {
  constructor(private readonly database: Database) {}

  private ownedParentExists(userId: number, applicationId: number) {
    return exists(
      this.database
        .select({ id: jobApplications.id })
        .from(jobApplications)
        .where(ownedApplication(userId, applicationId)),
    );
  }

  private async hasOwnedParent(transaction: Transaction, userId: number, applicationId: number): Promise<boolean> {
    const [application] = await transaction
      .select({ id: jobApplications.id })
      .from(jobApplications)
      .where(ownedApplication(userId, applicationId))
      .for("share")
      .limit(1);
    return Boolean(application);
  }

  async loadWorkspace(userId: number, applicationId: number): Promise<ApplicationWorkspaceData | null> {
    const [application] = await this.database
      .select({ id: jobApplications.id })
      .from(jobApplications)
      .where(ownedApplication(userId, applicationId))
      .limit(1);
    if (!application) return null;

    const [preparationRows, contactRows, taskRows] = await Promise.all([
      this.database
        .select()
        .from(applicationWorkspaces)
        .where(and(eq(applicationWorkspaces.userId, userId), eq(applicationWorkspaces.applicationId, applicationId)))
        .limit(1),
      this.database
        .select()
        .from(applicationContacts)
        .where(and(eq(applicationContacts.userId, userId), eq(applicationContacts.applicationId, applicationId)))
        .orderBy(asc(applicationContacts.createdAt), asc(applicationContacts.id)),
      this.database
        .select()
        .from(applicationFollowUpTasks)
        .where(
          and(eq(applicationFollowUpTasks.userId, userId), eq(applicationFollowUpTasks.applicationId, applicationId)),
        )
        .orderBy(
          sql`case when ${applicationFollowUpTasks.completedAt} is null then 0 else 1 end`,
          sql`case when ${applicationFollowUpTasks.completedAt} is null then ${applicationFollowUpTasks.dueDate} end`,
          asc(applicationFollowUpTasks.completedAt),
          asc(applicationFollowUpTasks.id),
        ),
    ]);
    return {
      preparation: toApplicationPreparation(preparationRows[0] ?? null),
      contacts: contactRows.map(toApplicationContact),
      followUpTasks: taskRows.map(toApplicationFollowUpTask),
    };
  }

  async updatePreparation(
    userId: number,
    applicationId: number,
    input: UpdateApplicationPreparationInput,
  ): Promise<ApplicationPreparation | null> {
    return this.database.transaction(async (transaction) => {
      if (!(await this.hasOwnedParent(transaction, userId, applicationId))) return null;
      const [row] = await transaction
        .insert(applicationWorkspaces)
        .values({
          applicationId,
          userId,
          companyResearch: input.companyResearch,
          talkingPoints: input.talkingPoints,
          interviewerQuestions: input.interviewerQuestions,
        })
        .onConflictDoUpdate({
          target: applicationWorkspaces.applicationId,
          set: {
            companyResearch: input.companyResearch,
            talkingPoints: input.talkingPoints,
            interviewerQuestions: input.interviewerQuestions,
            updatedAt: new Date(),
          },
          setWhere: eq(applicationWorkspaces.userId, userId),
        })
        .returning();
      return row ? toApplicationPreparation(row) : null;
    });
  }

  async createContact(
    userId: number,
    applicationId: number,
    input: CreateApplicationContactInput,
  ): Promise<ApplicationContact | null> {
    return this.database.transaction(async (transaction) => {
      if (!(await this.hasOwnedParent(transaction, userId, applicationId))) return null;
      const [row] = await transaction
        .insert(applicationContacts)
        .values({
          userId,
          applicationId,
          name: input.name,
          role: input.role,
          email: input.email,
          phone: input.phone,
          profileUrl: input.profileUrl,
          notes: input.notes,
        })
        .returning();
      if (!row) throw new Error("Unable to create application contact");
      return toApplicationContact(row);
    });
  }

  async updateContact(
    userId: number,
    applicationId: number,
    contactId: number,
    input: UpdateApplicationContactInput,
  ): Promise<ApplicationContact | null> {
    const [row] = await this.database
      .update(applicationContacts)
      .set({
        name: input.name,
        role: input.role,
        email: input.email,
        phone: input.phone,
        profileUrl: input.profileUrl,
        notes: input.notes,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(applicationContacts.userId, userId),
          eq(applicationContacts.applicationId, applicationId),
          eq(applicationContacts.id, contactId),
          this.ownedParentExists(userId, applicationId),
        ),
      )
      .returning();
    return row ? toApplicationContact(row) : null;
  }

  async deleteContact(userId: number, applicationId: number, contactId: number): Promise<boolean> {
    const result = await this.database
      .delete(applicationContacts)
      .where(
        and(
          eq(applicationContacts.userId, userId),
          eq(applicationContacts.applicationId, applicationId),
          eq(applicationContacts.id, contactId),
          this.ownedParentExists(userId, applicationId),
        ),
      );
    return result.count > 0;
  }

  async createFollowUpTask(
    userId: number,
    applicationId: number,
    input: CreateApplicationFollowUpTaskInput,
  ): Promise<ApplicationFollowUpTask | null> {
    return this.database.transaction(async (transaction) => {
      if (!(await this.hasOwnedParent(transaction, userId, applicationId))) return null;
      const [row] = await transaction
        .insert(applicationFollowUpTasks)
        .values({
          userId,
          applicationId,
          title: input.title,
          dueDate: input.dueDate,
          notes: input.notes,
        })
        .returning();
      if (!row) throw new Error("Unable to create follow-up task");
      return toApplicationFollowUpTask(row);
    });
  }

  async updateFollowUpTask(
    userId: number,
    applicationId: number,
    taskId: number,
    input: UpdateApplicationFollowUpTaskInput,
  ): Promise<ApplicationFollowUpTask | null> {
    const [row] = await this.database
      .update(applicationFollowUpTasks)
      .set({
        title: input.title,
        dueDate: input.dueDate,
        notes: input.notes,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(applicationFollowUpTasks.userId, userId),
          eq(applicationFollowUpTasks.applicationId, applicationId),
          eq(applicationFollowUpTasks.id, taskId),
          this.ownedParentExists(userId, applicationId),
        ),
      )
      .returning();
    return row ? toApplicationFollowUpTask(row) : null;
  }

  async completeFollowUpTask(
    userId: number,
    applicationId: number,
    taskId: number,
  ): Promise<ApplicationFollowUpTask | null> {
    const scope = and(
      eq(applicationFollowUpTasks.userId, userId),
      eq(applicationFollowUpTasks.applicationId, applicationId),
      eq(applicationFollowUpTasks.id, taskId),
      this.ownedParentExists(userId, applicationId),
    );
    const [completed] = await this.database
      .update(applicationFollowUpTasks)
      .set({ completedAt: new Date(), updatedAt: new Date() })
      .where(and(scope, isNull(applicationFollowUpTasks.completedAt)))
      .returning();
    if (completed) return toApplicationFollowUpTask(completed);
    const [existing] = await this.database.select().from(applicationFollowUpTasks).where(scope).limit(1);
    return existing ? toApplicationFollowUpTask(existing) : null;
  }

  async deleteFollowUpTask(userId: number, applicationId: number, taskId: number): Promise<boolean> {
    const result = await this.database
      .delete(applicationFollowUpTasks)
      .where(
        and(
          eq(applicationFollowUpTasks.userId, userId),
          eq(applicationFollowUpTasks.applicationId, applicationId),
          eq(applicationFollowUpTasks.id, taskId),
          this.ownedParentExists(userId, applicationId),
        ),
      );
    return result.count > 0;
  }

  async listForExport(userId: number): Promise<ApplicationExportRecord[]> {
    const rows = await this.database
      .select({ application: jobApplications, event: applicationEvents })
      .from(jobApplications)
      .leftJoin(
        applicationEvents,
        and(eq(applicationEvents.userId, userId), eq(applicationEvents.applicationId, jobApplications.id)),
      )
      .where(eq(jobApplications.userId, userId))
      .orderBy(asc(jobApplications.id), desc(applicationEvents.occurredAt), desc(applicationEvents.id));

    const records = new Map<number, ApplicationExportRecord>();
    for (const { application, event } of rows) {
      let record = records.get(application.id);
      if (!record) {
        record = { application: toJobApplication(application), events: [] };
        records.set(application.id, record);
      }
      if (event) record.events.push(toApplicationEvent(event));
    }

    return [...records.values()].map(({ application, events }) => ({
      application,
      events: withApplicationCreationEvent(application, events),
    }));
  }

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
