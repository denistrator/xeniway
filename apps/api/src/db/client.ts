import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createPostgresClient(databaseUrl: string) {
  return postgres(databaseUrl);
}

export function createDatabase(client: ReturnType<typeof createPostgresClient>) {
  return drizzle(client, { schema });
}
