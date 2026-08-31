import { createPostgresClient } from "./client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const client = createPostgresClient(databaseUrl);
const migration = Bun.file(new URL("../../drizzle/0000_create_messages.sql", import.meta.url));

try {
  await client.unsafe(await migration.text());
} finally {
  await client.end();
}
