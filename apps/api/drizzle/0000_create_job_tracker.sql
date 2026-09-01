CREATE TYPE "public"."job_status" AS ENUM('saved', 'applied', 'interview', 'offer', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TABLE "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" varchar(255) NOT NULL,
  "password_hash" varchar(255) NOT NULL,
  "first_name" varchar(100),
  "last_name" varchar(100),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE TABLE "sessions" (
  "id" varchar(128) PRIMARY KEY NOT NULL,
  "user_id" integer,
  "csrf_token" varchar(128) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL
);--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE TABLE "job_applications" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "company" varchar(255) NOT NULL,
  "position" varchar(255) NOT NULL,
  "location" varchar(500),
  "salary" varchar(500),
  "job_url" varchar(500),
  "description" text,
  "status" "job_status" DEFAULT 'saved' NOT NULL,
  "applied_at" date,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone,
  "seed_key" varchar(120)
);--> statement-breakpoint
CREATE INDEX "job_applications_user_status_idx" ON "job_applications" USING btree ("user_id", "status");--> statement-breakpoint
CREATE INDEX "job_applications_user_archive_idx" ON "job_applications" USING btree ("user_id", "archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "job_applications_seed_key_unique" ON "job_applications" USING btree ("seed_key");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
