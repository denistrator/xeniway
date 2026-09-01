ALTER TABLE "job_applications"
  ALTER COLUMN "applied_at" TYPE date
  USING "applied_at"::date;
