CREATE TABLE IF NOT EXISTS "messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "text" varchar(240) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
