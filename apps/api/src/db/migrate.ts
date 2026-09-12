import { createPostgresClient } from "./client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const client = createPostgresClient(databaseUrl);
const legacyInitialMigrationId = ["0000_create", "job", "tracker"].join("_");
const migrations = [
  { id: "0000_create_xeniway", file: "0000_create_xeniway.sql" },
  { id: "0001_applied_at_date", file: "0001_applied_at_date.sql" },
  { id: "0002_application_sort_order", file: "0002_application_sort_order.sql" },
  { id: "0003_blacklist_state", file: "0003_blacklist_state.sql" },
  { id: "0004_password_reset_tokens", file: "0004_password_reset_tokens.sql" },
  { id: "0005_user_preferences", file: "0005_user_preferences.sql" },
  { id: "0006_user_preference_values", file: "0006_user_preference_values.sql" },
  { id: "0007_user_preference_form_presentation", file: "0007_user_preference_form_presentation.sql" },
];

try {
  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS "schema_migrations" (
      "id" varchar(120) PRIMARY KEY NOT NULL,
      "applied_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);

  const [existingSchema] = await client<{ users: string | null }[]>`
    SELECT to_regclass('public.users') AS users
  `;
  const [legacyMigration] = await client<{ id: string }[]>`
    SELECT "id" FROM "schema_migrations" WHERE "id" = ${legacyInitialMigrationId}
  `;
  if (existingSchema?.users || legacyMigration) {
    await client`
      INSERT INTO "schema_migrations" ("id")
      VALUES ('0000_create_xeniway')
      ON CONFLICT ("id") DO NOTHING
    `;
  }

  for (const migration of migrations) {
    const [applied] = await client<{ id: string }[]>`
      SELECT "id" FROM "schema_migrations" WHERE "id" = ${migration.id}
    `;
    if (applied) continue;

    const sql = await Bun.file(new URL(`../../drizzle/${migration.file}`, import.meta.url)).text();
    await client.begin(async (transaction) => {
      await transaction.unsafe(sql);
      await transaction`
        INSERT INTO "schema_migrations" ("id") VALUES (${migration.id})
      `;
    });
  }
} finally {
  await client.end();
}
