import {
  date,
  index,
  integer,
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
    seedKey: varchar("seed_key", { length: 120 }),
  },
  (table) => [
    index("job_applications_user_status_idx").on(table.userId, table.status),
    index("job_applications_user_archive_idx").on(table.userId, table.archivedAt),
    uniqueIndex("job_applications_seed_key_unique").on(table.seedKey),
  ],
);
