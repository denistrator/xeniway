import { createApp } from "./app";
import { createDatabase, createPostgresClient } from "./db/client";
import { DrizzleApplicationRepository, DrizzleSessionRepository, DrizzleUserRepository } from "./db/repository";
import { createRedisClient } from "./redis/client";
import { RedisRateLimiter } from "./services/redis-rate-limit";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is required");
}

const port = Number(process.env.PORT ?? 3000);
const client = createPostgresClient(databaseUrl);
const redis = createRedisClient(redisUrl);
await redis.connect();
const database = createDatabase(client);
const users = new DrizzleUserRepository(database);
const sessions = new DrizzleSessionRepository(database);
const applications = new DrizzleApplicationRepository(database);
const SESSION_CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
const app = createApp({
  users,
  sessions,
  applications,
  authRateLimiter: new RedisRateLimiter(redis, { limit: 5, windowMs: 15 * 60 * 1000 }),
  health: async () => {
    try {
      await client`select 1`;
      return true;
    } catch {
      return false;
    }
  },
  redisHealth: async () => {
    try {
      return (await redis.ping()) === "PONG";
    } catch {
      return false;
    }
  },
}).listen(port);

const cleanupExpiredSessions = () => {
  void sessions.deleteExpired().catch((error) => {
    console.error("Unable to clean up expired sessions", error);
  });
};

cleanupExpiredSessions();
const cleanupTimer = setInterval(cleanupExpiredSessions, SESSION_CLEANUP_INTERVAL_MS);
cleanupTimer.unref();

console.log(`API listening at http://${app.server?.hostname ?? "localhost"}:${app.server?.port ?? port}`);
