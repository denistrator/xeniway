import { createApp } from "./app";
import { loadServerConfig } from "./config";
import { createDatabase, createPostgresClient } from "./db/client";
import {
  DrizzleApplicationRepository,
  DrizzlePasswordResetTokenRepository,
  DrizzleSessionRepository,
  DrizzleUserPreferencesRepository,
  DrizzleUserRepository,
} from "./db/repository";
import { createRedisClient } from "./redis/client";
import { ConsolePasswordResetMailer, SmtpPasswordResetMailer } from "./services/mailer";
import { RedisRateLimiter } from "./services/redis-rate-limit";

const config = loadServerConfig(process.env);
const client = createPostgresClient(config.databaseUrl);
const redis = createRedisClient(config.redisUrl);
await redis.connect();
const database = createDatabase(client);
const users = new DrizzleUserRepository(database);
const sessions = new DrizzleSessionRepository(database);
const applications = new DrizzleApplicationRepository(database);
const preferences = new DrizzleUserPreferencesRepository(database);
const passwordResetTokens = new DrizzlePasswordResetTokenRepository(database);
const passwordResetMailer =
  config.smtpUrl && config.mailFrom
    ? new SmtpPasswordResetMailer(config.smtpUrl, config.mailFrom)
    : new ConsolePasswordResetMailer();
const SESSION_CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
const app = createApp({
  users,
  sessions,
  applications,
  preferences,
  passwordResetTokens,
  passwordResetMailer,
  appOrigin: config.appOrigin,
  corsOrigin: config.corsOrigin,
  secureCookies: config.nodeEnv === "production",
  passwordResetRateLimiter: new RedisRateLimiter(redis, { limit: 5, windowMs: 15 * 60 * 1000 }),
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
}).listen(config.port);

const cleanupExpiredSessions = () => {
  void sessions.deleteExpired().catch((error) => {
    console.error("Unable to clean up expired sessions", error);
  });
};

cleanupExpiredSessions();
const cleanupTimer = setInterval(cleanupExpiredSessions, SESSION_CLEANUP_INTERVAL_MS);
cleanupTimer.unref();

console.log(`API listening at http://${app.server?.hostname ?? "localhost"}:${app.server?.port ?? config.port}`);
