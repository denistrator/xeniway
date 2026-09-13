import { describe, expect, it } from "vitest";
import { loadServerConfig } from "./config";

const productionEnvironment = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://app:strong-password@db.internal:5432/xeniway",
  REDIS_URL: "rediss://default:strong-password@redis.internal:6379",
  APP_ORIGIN: "https://xeniway.example.com",
  SMTP_URL: "smtps://mailer:strong-password@smtp.example.com:465",
  MAIL_FROM: "Xenia Way <no-reply@example.com>",
};

const invalidConfigurations: Array<{
  name: string;
  environment: Record<string, string>;
  message: string;
}> = [
  {
    name: "hostless DATABASE_URL",
    environment: { DATABASE_URL: "postgres:///xeniway" },
    message: "DATABASE_URL must include a hostname",
  },
  {
    name: "hostless REDIS_URL",
    environment: { REDIS_URL: "redis:///0" },
    message: "REDIS_URL must include a hostname",
  },
  {
    name: "hostless SMTP_URL",
    environment: { SMTP_URL: "smtp:///" },
    message: "SMTP_URL must include a hostname",
  },
  {
    name: "wrong DATABASE_URL scheme",
    environment: { DATABASE_URL: "mysql://db.internal/xeniway" },
    message: "DATABASE_URL must use postgres: or postgresql:",
  },
  {
    name: "wrong REDIS_URL scheme",
    environment: { REDIS_URL: "https://redis.internal" },
    message: "REDIS_URL must use redis: or rediss:",
  },
  {
    name: "wrong SMTP_URL scheme",
    environment: { SMTP_URL: "https://smtp.example.com" },
    message: "SMTP_URL must use smtp: or smtps:",
  },
  {
    name: "wrong APP_ORIGIN scheme",
    environment: { APP_ORIGIN: "ftp://xeniway.example.com" },
    message: "APP_ORIGIN must use http: or https:",
  },
  {
    name: "trailing-dot database localhost",
    environment: { DATABASE_URL: "postgres://app:password@localhost.:5432/xeniway" },
    message: "DATABASE_URL must not use a local development value in production",
  },
  {
    name: "trailing-dot app localhost",
    environment: { APP_ORIGIN: "https://localhost." },
    message: "APP_ORIGIN must not use a local development value in production",
  },
  {
    name: "IPv4 loopback REDIS_URL",
    environment: { REDIS_URL: "redis://127.0.0.42:6379" },
    message: "REDIS_URL must not use a local development value in production",
  },
  {
    name: "IPv6 loopback SMTP_URL",
    environment: { SMTP_URL: "smtp://[::1]:1025" },
    message: "SMTP_URL must not use a local development value in production",
  },
  {
    name: "IPv4-mapped loopback SMTP_URL",
    environment: { SMTP_URL: "smtp://[::ffff:127.0.0.1]:1025" },
    message: "SMTP_URL must not use a local development value in production",
  },
  {
    name: "numeric IPv4 loopback DATABASE_URL",
    environment: { DATABASE_URL: "postgres://app:password@2130706433:5432/xeniway" },
    message: "DATABASE_URL must not use a local development value in production",
  },
  {
    name: "hexadecimal IPv4 loopback REDIS_URL",
    environment: { REDIS_URL: "redis://0x7f000001:6379" },
    message: "REDIS_URL must not use a local development value in production",
  },
  {
    name: "octal IPv4 loopback SMTP_URL",
    environment: { SMTP_URL: "smtp://017700000001:1025" },
    message: "SMTP_URL must not use a local development value in production",
  },
  {
    name: "zero PORT",
    environment: { PORT: "0" },
    message: "PORT must be an integer between 1 and 65535",
  },
  {
    name: "out-of-range PORT",
    environment: { PORT: "65536" },
    message: "PORT must be an integer between 1 and 65535",
  },
  {
    name: "fractional PORT",
    environment: { PORT: "3000.5" },
    message: "PORT must be an integer between 1 and 65535",
  },
  {
    name: "MAIL_FROM with an empty DNS label",
    environment: { MAIL_FROM: "Xenia Way <no-reply@example..com>" },
    message: "MAIL_FROM must contain a valid email address",
  },
  {
    name: "MAIL_FROM without an at sign",
    environment: { MAIL_FROM: "example.com" },
    message: "MAIL_FROM must contain a valid email address",
  },
  {
    name: "MAIL_FROM with a leading domain hyphen",
    environment: { MAIL_FROM: "Xenia Way <no-reply@-example.com>" },
    message: "MAIL_FROM must contain a valid email address",
  },
  {
    name: "MAIL_FROM with a display-name control character",
    environment: { MAIL_FROM: "Xenia\tWay <no-reply@example.com>" },
    message: "MAIL_FROM must contain a valid email address",
  },
  {
    name: "MAIL_FROM with an IP-like domain",
    environment: { MAIL_FROM: "Xenia Way <no-reply@192.0.2.1>" },
    message: "MAIL_FROM must not use an IP or local domain in production",
  },
  {
    name: "MAIL_FROM with a loopback domain",
    environment: { MAIL_FROM: "Xenia Way <no-reply@127.0.0.1>" },
    message: "MAIL_FROM must not use an IP or local domain in production",
  },
  {
    name: "MAIL_FROM with a localhost subdomain",
    environment: { MAIL_FROM: "Xenia Way <no-reply@mail.localhost>" },
    message: "MAIL_FROM must not use an IP or local domain in production",
  },
  {
    name: "MAIL_FROM with a local development domain",
    environment: { MAIL_FROM: "Xenia Way <no-reply@xeniway.local>" },
    message: "MAIL_FROM must not use an IP or local domain in production",
  },
  {
    name: "insecure production CORS_ORIGIN",
    environment: { CORS_ORIGIN: "http://web.example.com" },
    message: "CORS_ORIGIN must use https in production",
  },
  {
    name: "production CORS_ORIGIN with a path",
    environment: { CORS_ORIGIN: "https://web.example.com/app" },
    message: "CORS_ORIGIN must be an origin without credentials, path, query, or fragment",
  },
  {
    name: "unsupported NODE_ENV",
    environment: { NODE_ENV: "staging" },
    message: "NODE_ENV must be development, test, or production",
  },
];

describe("server configuration", () => {
  it.each(invalidConfigurations)("rejects $name", ({ environment, message }) => {
    expect(() => loadServerConfig({ ...productionEnvironment, ...environment })).toThrow(message);
  });

  it.each(["development", "test"] as const)("accepts the %s runtime mode", (nodeEnv) => {
    expect(loadServerConfig({ ...productionEnvironment, NODE_ENV: nodeEnv }).nodeEnv).toBe(nodeEnv);
  });

  it("loads explicit production dependencies", () => {
    expect(loadServerConfig(productionEnvironment)).toEqual({
      nodeEnv: "production",
      databaseUrl: productionEnvironment.DATABASE_URL,
      redisUrl: productionEnvironment.REDIS_URL,
      port: 3000,
      appOrigin: productionEnvironment.APP_ORIGIN,
      corsOrigin: productionEnvironment.APP_ORIGIN,
      smtpUrl: productionEnvironment.SMTP_URL,
      mailFrom: productionEnvironment.MAIL_FROM,
    });
  });

  it.each(["DATABASE_URL", "REDIS_URL", "APP_ORIGIN", "SMTP_URL", "MAIL_FROM"] as const)(
    "rejects a missing production %s",
    (name) => {
      expect(() => loadServerConfig({ ...productionEnvironment, [name]: "" })).toThrow(`${name} is required`);
    },
  );

  it.each([
    ["DATABASE_URL", "postgres://xeniway:xeniway@localhost:5432/xeniway"],
    ["REDIS_URL", "redis://localhost:6379"],
    ["APP_ORIGIN", "http://localhost:5173"],
    ["SMTP_URL", "smtp://127.0.0.1:1025"],
  ] as const)("rejects the local production %s", (name, value) => {
    expect(() => loadServerConfig({ ...productionEnvironment, [name]: value })).toThrow(
      `${name} must not use a local development value in production`,
    );
  });

  it("rejects insecure production origins", () => {
    expect(() => loadServerConfig({ ...productionEnvironment, APP_ORIGIN: "http://xeniway.example.com" })).toThrow(
      "APP_ORIGIN must use https in production",
    );
  });

  it("retains local development defaults when SMTP is intentionally absent", () => {
    expect(
      loadServerConfig({
        DATABASE_URL: "postgres://xeniway:xeniway@localhost:5432/xeniway",
        REDIS_URL: "redis://localhost:6379",
      }),
    ).toMatchObject({
      nodeEnv: "development",
      appOrigin: "http://localhost:5173",
      corsOrigin: "http://localhost:5173",
      smtpUrl: undefined,
      mailFrom: undefined,
    });
  });

  it("accepts the documented local Mailpit configuration", () => {
    expect(
      loadServerConfig({
        DATABASE_URL: "postgres://xeniway:xeniway@localhost:5432/xeniway",
        REDIS_URL: "redis://localhost:6379",
        SMTP_URL: "smtp://127.0.0.1:1025",
        MAIL_FROM: "Xenia Way <no-reply@xeniway.local>",
      }),
    ).toMatchObject({
      smtpUrl: "smtp://127.0.0.1:1025",
      mailFrom: "Xenia Way <no-reply@xeniway.local>",
    });
  });

  it("requires SMTP_URL and MAIL_FROM together outside production", () => {
    expect(() =>
      loadServerConfig({
        DATABASE_URL: "postgres://xeniway:xeniway@localhost:5432/xeniway",
        REDIS_URL: "redis://localhost:6379",
        SMTP_URL: "smtp://127.0.0.1:1025",
      }),
    ).toThrow("SMTP_URL and MAIL_FROM must be configured together");
  });
});
