import type {
  ApplicationBoard,
  ApplicationContact,
  ApplicationEvent,
  ApplicationEventInput,
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
  UpdateUserPreferencesInput,
} from "@xeniway/shared";
import type {
  applicationContacts,
  applicationEvents,
  applicationFollowUpTasks,
  applicationWorkspaces,
  jobApplications,
  sessions,
  userPreferences,
  users,
} from "../schema";

export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type UserPreferencesRow = typeof userPreferences.$inferSelect;
export type ApplicationEventRow = typeof applicationEvents.$inferSelect;
export type ApplicationWorkspaceRow = typeof applicationWorkspaces.$inferSelect;
export type ApplicationContactRow = typeof applicationContacts.$inferSelect;
export type ApplicationFollowUpTaskRow = typeof applicationFollowUpTasks.$inferSelect;
export type JobApplicationRow = typeof jobApplications.$inferSelect;
export type ApplicationExportRecord = { application: JobApplication; events: ApplicationEvent[] };
export type ApplicationWorkspaceData = {
  preparation: ApplicationPreparation;
  contacts: ApplicationContact[];
  followUpTasks: ApplicationFollowUpTask[];
};
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
  loadWorkspace(userId: number, applicationId: number): Promise<ApplicationWorkspaceData | null>;
  updatePreparation(
    userId: number,
    applicationId: number,
    input: UpdateApplicationPreparationInput,
  ): Promise<ApplicationPreparation | null>;
  createContact(
    userId: number,
    applicationId: number,
    input: CreateApplicationContactInput,
  ): Promise<ApplicationContact | null>;
  updateContact(
    userId: number,
    applicationId: number,
    contactId: number,
    input: UpdateApplicationContactInput,
  ): Promise<ApplicationContact | null>;
  deleteContact(userId: number, applicationId: number, contactId: number): Promise<boolean>;
  createFollowUpTask(
    userId: number,
    applicationId: number,
    input: CreateApplicationFollowUpTaskInput,
  ): Promise<ApplicationFollowUpTask | null>;
  updateFollowUpTask(
    userId: number,
    applicationId: number,
    taskId: number,
    input: UpdateApplicationFollowUpTaskInput,
  ): Promise<ApplicationFollowUpTask | null>;
  completeFollowUpTask(userId: number, applicationId: number, taskId: number): Promise<ApplicationFollowUpTask | null>;
  deleteFollowUpTask(userId: number, applicationId: number, taskId: number): Promise<boolean>;
  listForExport(userId: number): Promise<ApplicationExportRecord[]>;
  list(userId: number, options?: { status?: JobStatus; archived?: boolean }): Promise<JobApplication[]>;
  findById(
    userId: number,
    id: number,
    options?: { archived?: boolean; anyState?: boolean },
  ): Promise<JobApplication | null>;
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
  listEvents(userId: number, applicationId: number): Promise<ApplicationEvent[]>;
  createEvent(userId: number, applicationId: number, input: ApplicationEventInput): Promise<ApplicationEvent | null>;
  updateEvent(
    userId: number,
    applicationId: number,
    eventId: number,
    input: UpdateApplicationEventInput,
  ): Promise<ApplicationEvent | null>;
  deleteEvent(userId: number, applicationId: number, eventId: number): Promise<boolean>;
}
