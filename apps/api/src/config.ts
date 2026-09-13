type Environment = Record<string, string | undefined>;
export type RuntimeMode = "development" | "test" | "production";

export type ServerConfig = {
  nodeEnv: RuntimeMode;
  databaseUrl: string;
  redisUrl: string;
  port: number;
  appOrigin: string;
  corsOrigin: string;
  smtpUrl: string | undefined;
  mailFrom: string | undefined;
};

function required(environment: Environment, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parseUrl(name: string, value: string, protocols: string[]): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
  if (!protocols.includes(url.protocol)) {
    throw new Error(`${name} must use ${protocols.join(" or ")}`);
  }
  if (!url.hostname) {
    throw new Error(`${name} must include a hostname`);
  }
  return url;
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "")
    .toLowerCase();
  let canonicalIpv4 = "";
  if (!normalized.includes(":")) {
    try {
      canonicalIpv4 = new URL(`http://${normalized}`).hostname;
    } catch {
      canonicalIpv4 = "";
    }
  }
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "::1" ||
    /^127\./.test(normalized) ||
    /^127\./.test(canonicalIpv4) ||
    /^::ffff:127\./.test(normalized) ||
    /^::ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}$/.test(normalized)
  );
}

function parseRuntimeMode(value: string | undefined): RuntimeMode {
  const mode = value?.trim() || "development";
  if (mode !== "development" && mode !== "test" && mode !== "production") {
    throw new Error("NODE_ENV must be development, test, or production");
  }
  return mode;
}

function assertProductionServiceUrl(name: string, value: string, protocols: string[]): void {
  const url = parseUrl(name, value, protocols);
  if (isLocalHostname(url.hostname)) {
    throw new Error(`${name} must not use a local development value in production`);
  }
}

function assertOrigin(name: string, value: string, production: boolean): void {
  const url = parseUrl(name, value, ["http:", "https:"]);
  if (url.origin !== value || url.username || url.password) {
    throw new Error(`${name} must be an origin without credentials, path, query, or fragment`);
  }
  if (production && isLocalHostname(url.hostname)) {
    throw new Error(`${name} must not use a local development value in production`);
  }
  if (production && url.protocol !== "https:") {
    throw new Error(`${name} must use https in production`);
  }
}

function containsAsciiControl(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });
}

function assertMailFrom(value: string, production: boolean): void {
  if (containsAsciiControl(value)) {
    throw new Error("MAIL_FROM must contain a valid email address");
  }
  const bracketed = value.match(/^[^<>]*<([^<>]+)>$/);
  if ((value.includes("<") || value.includes(">")) && !bracketed) {
    throw new Error("MAIL_FROM must contain a valid email address");
  }
  const address = bracketed?.[1] ?? value;
  const separator = address.lastIndexOf("@");
  const localPart = address.slice(0, separator);
  const domain = address.slice(separator + 1).toLowerCase();
  const domainLabels = domain.split(".");
  const validLocalPart =
    separator > 0 &&
    address.indexOf("@") === separator &&
    localPart.length > 0 &&
    localPart.length <= 64 &&
    /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(localPart) &&
    !localPart.startsWith(".") &&
    !localPart.endsWith(".") &&
    !localPart.includes("..");
  const validDomain =
    domain.length <= 253 &&
    domainLabels.length >= 2 &&
    domainLabels.every(
      (label) => label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    );
  if (!validLocalPart || !validDomain) {
    throw new Error("MAIL_FROM must contain a valid email address");
  }
  const ipv4LikeDomain = /^\d+(?:\.\d+){3}$/.test(domain);
  const localDomain =
    domain === "localhost" ||
    domain.endsWith(".localhost") ||
    domain === "local" ||
    domain.endsWith(".local") ||
    domain === "localdomain" ||
    domain.endsWith(".localdomain");
  if (production && (ipv4LikeDomain || localDomain)) {
    throw new Error("MAIL_FROM must not use an IP or local domain in production");
  }
}

export function loadServerConfig(environment: Environment): ServerConfig {
  const nodeEnv = parseRuntimeMode(environment.NODE_ENV);
  const production = nodeEnv === "production";
  const databaseUrl = required(environment, "DATABASE_URL");
  const redisUrl = required(environment, "REDIS_URL");
  const appOrigin = production
    ? required(environment, "APP_ORIGIN")
    : environment.APP_ORIGIN?.trim() || "http://localhost:5173";
  const corsOrigin = environment.CORS_ORIGIN?.trim() || appOrigin;
  const smtpUrl = environment.SMTP_URL?.trim() || undefined;
  if (environment.MAIL_FROM && containsAsciiControl(environment.MAIL_FROM)) {
    throw new Error("MAIL_FROM must contain a valid email address");
  }
  const mailFrom = environment.MAIL_FROM?.trim() || undefined;
  const port = Number(environment.PORT?.trim() || 3000);

  parseUrl("DATABASE_URL", databaseUrl, ["postgres:", "postgresql:"]);
  parseUrl("REDIS_URL", redisUrl, ["redis:", "rediss:"]);
  assertOrigin("APP_ORIGIN", appOrigin, production);
  assertOrigin("CORS_ORIGIN", corsOrigin, production);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  if (production) {
    assertProductionServiceUrl("DATABASE_URL", databaseUrl, ["postgres:", "postgresql:"]);
    assertProductionServiceUrl("REDIS_URL", redisUrl, ["redis:", "rediss:"]);
    assertProductionServiceUrl("SMTP_URL", required(environment, "SMTP_URL"), ["smtp:", "smtps:"]);
    assertMailFrom(required(environment, "MAIL_FROM"), true);
  }

  if (Boolean(smtpUrl) !== Boolean(mailFrom)) {
    throw new Error("SMTP_URL and MAIL_FROM must be configured together");
  }
  if (smtpUrl && mailFrom) {
    parseUrl("SMTP_URL", smtpUrl, ["smtp:", "smtps:"]);
    assertMailFrom(mailFrom, production);
  }

  return { nodeEnv, databaseUrl, redisUrl, port, appOrigin, corsOrigin, smtpUrl, mailFrom };
}
