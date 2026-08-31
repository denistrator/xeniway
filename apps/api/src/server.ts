import { createApp } from "./app";
import { createDatabase, createPostgresClient } from "./db/client";
import { DrizzleMessageRepository } from "./db/repository";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const port = Number(process.env.PORT ?? 3000);
const client = createPostgresClient(databaseUrl);
const database = createDatabase(client);
const repository = new DrizzleMessageRepository(database, client);
const app = createApp(repository).listen(port);

console.log(`API listening at http://${app.server?.hostname ?? "localhost"}:${app.server?.port ?? port}`);
