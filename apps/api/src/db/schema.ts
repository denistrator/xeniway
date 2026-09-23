import type { ApplicationEventType, JobStatus } from "@xeniway/shared";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const jobStatus = pgEnum("job_status", ["saved", "applied", "interview", "offer", "rejected", "withdrawn"]);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    csrfToken: varchar("csrf_token", { length: 128 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const userPreferences = pgTable("user_preferences", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  wasIntroduced: boolean("was_introduced").default(false).notNull(),
  selectedLanguage: varchar("selected_language", { length: 2 }),
  selectedTheme: varchar("selected_theme", { length: 10 }),
  selectedFormPresentation: varchar("selected_form_presentation", { length: 10 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("password_reset_tokens_hash_unique").on(table.tokenHash),
    index("password_reset_tokens_user_created_idx").on(table.userId, table.createdAt),
    index("password_reset_tokens_hash_expiry_idx").on(table.tokenHash, table.expiresAt),
  ],
);

export const jobApplications = pgTable(
  "job_applications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    company: varchar("company", { length: 255 }).notNull(),
    position: varchar("position", { length: 255 }).notNull(),
    location: varchar("location", { length: 500 }),
    salary: varchar("salary", { length: 500 }),
    jobUrl: varchar("job_url", { length: 500 }),
    description: text("description"),
    status: jobStatus("status").default("saved").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    appliedAt: date("applied_at", { mode: "string" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    blacklistedAt: timestamp("blacklisted_at", { withTimezone: true }),
    blacklistReason: text("blacklist_reason"),
    seedKey: varchar("seed_key", { length: 120 }),
  },
  (table) => [
    index("job_applications_user_status_idx").on(table.userId, table.status),
    index("job_applications_user_archive_idx").on(table.userId, table.archivedAt),
    index("job_applications_user_blacklist_idx").on(table.userId, table.blacklistedAt),
    uniqueIndex("job_applications_seed_key_unique").on(table.seedKey),
  ],
);

export const applicationEvents = pgTable(
  "application_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    applicationId: integer("application_id")
      .notNull()
      .references(() => jobApplications.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 40 }).$type<ApplicationEventType>().notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    metadata: jsonb("metadata").$type<{ from: JobStatus; to: JobStatus } | null>(),
    isSystem: boolean("is_system").notNull(),
  },
  (table) => [
    index("application_events_application_occurred_idx").on(
      table.applicationId,
      table.occurredAt.desc(),
      table.id.desc(),
    ),
    index("application_events_user_occurred_idx").on(table.userId, table.occurredAt.desc()),
  ],
);

export const applicationWorkspaces = pgTable(
  "application_workspaces",
  {
    applicationId: integer("application_id")
      .primaryKey()
      .references(() => jobApplications.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyResearch: text("company_research"),
    talkingPoints: text("talking_points"),
    interviewerQuestions: text("interviewer_questions"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("application_workspaces_user_id_idx").on(table.userId)],
);

export const applicationContacts = pgTable(
  "application_contacts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    applicationId: integer("application_id")
      .notNull()
      .references(() => jobApplications.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    role: varchar("role", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 100 }),
    profileUrl: varchar("profile_url", { length: 500 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("application_contacts_application_created_idx").on(table.applicationId, table.createdAt, table.id),
    index("application_contacts_user_id_idx").on(table.userId),
  ],
);

export const applicationFollowUpTasks = pgTable(
  "application_follow_up_tasks",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    applicationId: integer("application_id")
      .notNull()
      .references(() => jobApplications.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    notes: text("notes"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("application_follow_up_tasks_application_completion_due_idx").on(
      table.applicationId,
      table.completedAt,
      table.dueDate,
      table.id,
    ),
    index("application_follow_up_tasks_user_id_idx").on(table.userId),
  ],
);
