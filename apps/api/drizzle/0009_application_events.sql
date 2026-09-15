CREATE TABLE "application_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "application_id" integer NOT NULL REFERENCES "job_applications"("id") ON DELETE CASCADE,
  "type" varchar(40) NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "occurred_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "metadata" jsonb,
  "is_system" boolean NOT NULL,
  CONSTRAINT "application_events_title_nonempty" CHECK (length(trim("title")) > 0),
  CONSTRAINT "application_events_type_valid" CHECK ("type" IN (
    'application_created', 'application_edited', 'status_changed', 'archived',
    'restored_from_archive', 'blacklisted', 'restored_from_blacklist',
    'note', 'email_sent', 'email_received', 'phone_call', 'interview_scheduled',
    'interview_completed', 'offer_received', 'rejection_received', 'follow_up', 'custom'
  )),
  CONSTRAINT "application_events_metadata_valid" CHECK (
    ("type" = 'status_changed' AND "is_system" = true AND "metadata" IS NOT NULL AND
      jsonb_typeof("metadata") = 'object' AND
      "metadata"->>'from' IN ('saved', 'applied', 'interview', 'offer', 'rejected', 'withdrawn') AND
      "metadata"->>'to' IN ('saved', 'applied', 'interview', 'offer', 'rejected', 'withdrawn'))
    OR ("type" <> 'status_changed' AND "metadata" IS NULL)
  ),
  CONSTRAINT "application_events_kind_valid" CHECK (
    ("is_system" = true AND "type" IN (
      'application_created', 'application_edited', 'status_changed', 'archived',
      'restored_from_archive', 'blacklisted', 'restored_from_blacklist'))
    OR ("is_system" = false AND "type" IN (
      'note', 'email_sent', 'email_received', 'phone_call', 'interview_scheduled',
      'interview_completed', 'offer_received', 'rejection_received', 'follow_up', 'custom'))
  )
);

CREATE INDEX "application_events_application_occurred_idx"
  ON "application_events" ("application_id", "occurred_at" DESC, "id" DESC);
CREATE INDEX "application_events_user_occurred_idx"
  ON "application_events" ("user_id", "occurred_at" DESC);
