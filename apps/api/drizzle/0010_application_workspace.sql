CREATE TABLE "application_workspaces" (
  "application_id" integer PRIMARY KEY NOT NULL REFERENCES "job_applications"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "company_research" text,
  "talking_points" text,
  "interviewer_questions" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "application_workspaces_research_length" CHECK ("company_research" IS NULL OR length("company_research") <= 10000),
  CONSTRAINT "application_workspaces_talking_points_length" CHECK ("talking_points" IS NULL OR length("talking_points") <= 10000),
  CONSTRAINT "application_workspaces_questions_length" CHECK ("interviewer_questions" IS NULL OR length("interviewer_questions") <= 10000)
);

CREATE INDEX "application_workspaces_user_id_idx" ON "application_workspaces" ("user_id");

CREATE TABLE "application_contacts" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "application_id" integer NOT NULL REFERENCES "job_applications"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "role" varchar(255) NOT NULL,
  "email" varchar(255),
  "phone" varchar(100),
  "profile_url" varchar(500),
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "application_contacts_name_nonempty" CHECK (length(trim("name")) > 0),
  CONSTRAINT "application_contacts_role_nonempty" CHECK (length(trim("role")) > 0),
  CONSTRAINT "application_contacts_notes_length" CHECK ("notes" IS NULL OR length("notes") <= 10000),
  CONSTRAINT "application_contacts_profile_http" CHECK ("profile_url" IS NULL OR "profile_url" ~* '^https?://')
);

CREATE INDEX "application_contacts_application_created_idx"
  ON "application_contacts" ("application_id", "created_at", "id");
CREATE INDEX "application_contacts_user_id_idx" ON "application_contacts" ("user_id");

CREATE TABLE "application_follow_up_tasks" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "application_id" integer NOT NULL REFERENCES "job_applications"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "due_date" date NOT NULL,
  "notes" text,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "application_follow_up_tasks_title_nonempty" CHECK (length(trim("title")) > 0),
  CONSTRAINT "application_follow_up_tasks_notes_length" CHECK ("notes" IS NULL OR length("notes") <= 10000)
);

CREATE INDEX "application_follow_up_tasks_application_completion_due_idx"
  ON "application_follow_up_tasks" ("application_id", "completed_at", "due_date", "id");
CREATE INDEX "application_follow_up_tasks_user_id_idx" ON "application_follow_up_tasks" ("user_id");
