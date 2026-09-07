ALTER TABLE "job_applications" ADD COLUMN "blacklisted_at" timestamp with time zone;
ALTER TABLE "job_applications" ADD COLUMN "blacklist_reason" text;
CREATE INDEX "job_applications_user_blacklist_idx" ON "job_applications" USING btree ("user_id", "blacklisted_at");
