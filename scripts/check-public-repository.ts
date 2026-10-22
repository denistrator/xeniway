/// <reference types="bun-types" />

export interface Finding {
  path: string;
  rule: string;
}

interface ContentRule {
  name: string;
  pattern: RegExp;
}

const contentRules: ContentRule[] = [
  {
    name: "private-key-header",
    pattern: /-----BEGIN (?:(?:RSA |DSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY|PGP PRIVATE KEY BLOCK)-----/,
  },
  { name: "aws-access-token", pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  {
    name: "github-token",
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{80,255})\b/,
  },
  { name: "google-api-key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: "slack-token", pattern: /\bxox[baprs]-[0-9A-Za-z-]{20,200}\b/ },
  { name: "stripe-live-secret", pattern: /\bsk_live_[0-9A-Za-z]{16,255}\b/ },
];

const credentialKeyPattern =
  /^(?:(?:[A-Za-z][A-Za-z0-9_-]*)?(?:password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key)|database[_-]?url|redis[_-]?url|smtp[_-]?url)$/i;

const credentialAssignmentPattern = new RegExp(
  `^\\s*(?:export\\s+)?["']?(${credentialKeyPattern.source.slice(1, -1)})["']?\\s*[:=]\\s*(.+?)\\s*[,;]?\\s*$`,
  "i",
);

const reviewedLocaleLabels = new Map<string, ReadonlyMap<string, string>>([
  [
    "apps/web/src/i18n/locales/ru.json",
    new Map([
      ["auth.fields.password", "Пароль"],
      ["auth.fields.newPassword", "Новый пароль"],
      ["auth.fields.confirmPassword", "Подтвердите пароль"],
      ["auth.login.forgotPassword", "Забыли пароль?"],
      ["auth.forgotPassword.rememberedPassword", "Вспомнили пароль?"],
    ]),
  ],
  [
    "apps/web/src/i18n/locales/uk.json",
    new Map([
      ["auth.fields.password", "Пароль"],
      ["auth.fields.newPassword", "Новий пароль"],
      ["auth.fields.confirmPassword", "Підтвердьте пароль"],
      ["auth.login.forgotPassword", "Забули пароль?"],
      ["auth.forgotPassword.rememberedPassword", "Згадали пароль?"],
    ]),
  ],
  [
    "apps/web/src/i18n/locales/he.json",
    new Map([
      ["auth.fields.password", "סיסמה"],
      ["auth.fields.newPassword", "סיסמה חדשה"],
      ["auth.fields.confirmPassword", "אישור סיסמה"],
      ["auth.login.forgotPassword", "שכחתם את הסיסמה?"],
      ["auth.forgotPassword.rememberedPassword", "נזכרתם בסיסמה?"],
    ]),
  ],
]);

function hasPathComponent(path: string, names: readonly string[]): boolean {
  const components = path.split("/");
  return components.some((component) => names.includes(component.toLowerCase()));
}

function isDatabaseDump(path: string, basename: string): boolean {
  const hasDumpExtension = /\.(?:backup|bak|dmp|dump|pgdump|sql\.(?:bz2|gz|xz|zip))$/.test(path);
  const hasDatabaseName =
    /^(?:database|db|dev(?:elopment)?|prod(?:uction)?|stag(?:e|ing))(?:[-_.][a-z0-9-]+)*\.sql$/.test(basename);
  const hasBackupLocation =
    hasPathComponent(path, ["backup", "backups", "dump", "dumps"]) || /(?:backup|dump)/.test(basename);
  const isBackupSql = /\.sql$/.test(path) && hasBackupLocation;
  return hasDumpExtension || hasDatabaseName || isBackupSql;
}

export function findForbiddenPath(path: string): Finding | null {
  const lowerPath = path.toLowerCase();
  const basename = lowerPath.split("/").at(-1) ?? lowerPath;

  if (basename !== ".env.example" && (basename === ".env" || basename.startsWith(".env."))) {
    return { path, rule: "tracked-env-file" };
  }

  if (
    /\.(?:cer|crt|der|key|p7b|p12|pem|pfx)$/.test(lowerPath) ||
    /^(?:id_dsa|id_ecdsa|id_ed25519|id_rsa)$/.test(basename)
  ) {
    return { path, rule: "private-key-or-certificate" };
  }

  if (
    /^(?:\.netrc|\.npmrc|\.pypirc|credentials|(?:auth|credentials|service[-_]account|serviceaccountkey|secrets?|token)(?:[-_.][a-z0-9-]+)*\.(?:json|ya?ml))$/.test(
      basename,
    )
  ) {
    return { path, rule: "credential-file" };
  }

  if (hasPathComponent(lowerPath, ["node_modules"])) {
    return { path, rule: "dependency-directory" };
  }

  if (hasPathComponent(lowerPath, ["dist"])) {
    return { path, rule: "build-output" };
  }

  if (hasPathComponent(lowerPath, ["playwright-report", "test-results"])) {
    return { path, rule: "playwright-output" };
  }

  if (
    hasPathComponent(lowerPath, [".fleet", ".idea", ".settings", ".vs", ".vscode"]) ||
    [".classpath", ".project"].includes(basename) ||
    basename.endsWith(".iml")
  ) {
    return { path, rule: "ide-metadata" };
  }

  if (hasPathComponent(lowerPath, [".worktrees", "worktrees"])) {
    return { path, rule: "worktree-metadata" };
  }

  if (isDatabaseDump(lowerPath, basename)) {
    return { path, rule: "database-dump" };
  }

  return null;
}

function isCredentialBearingText(path: string): boolean {
  const basename = path.toLowerCase().split("/").at(-1) ?? path.toLowerCase();
  return basename.startsWith(".env") || /\.(?:conf|config|ini|json|md|properties|toml|txt|ya?ml)$/.test(basename);
}

function isPlaceholderCredential(rawValue: string): boolean {
  const value = rawValue
    .replace(/\s+#.*$/, "")
    .replace(/^(["'])(.*)\1$/, "$2")
    .trim()
    .toLowerCase();

  if (value.length === 0) {
    return true;
  }

  if (
    [
      "development",
      "job_tracker",
      "local",
      "password",
      "password123",
      "postgres",
      "test",
      "testing",
      "xeniway",
    ].includes(value)
  ) {
    return true;
  }

  if (
    /^(?:change[-_ ]?me|replace[-_ ]?me|placeholder|example|dummy|fake|sample)(?:[-_ ]?(?:credential|key|password|secret|token|value))?$/.test(
      value,
    ) ||
    /^your[-_ ](?:api[-_ ]?key|password|secret|token)(?:[-_ ]?here)?$/.test(value) ||
    /^<[^<>\r\n]+>$/.test(value) ||
    /^\$(?:[A-Z_][A-Z0-9_]*|\{[A-Z_][A-Z0-9_]*\}|\{\{\s*(?:secrets|vars)\.[A-Z_][A-Z0-9_]*\s*\}\})$/i.test(value) ||
    /^(?:bun|process)\.env\.[A-Z_][A-Z0-9_]*$/i.test(value) ||
    /^import\.meta\.env\.[A-Z_][A-Z0-9_]*$/i.test(value)
  ) {
    return true;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    const password = decodeURIComponent(url.password).toLowerCase();
    const isFixturePassword =
      password.length === 0 || ["job_tracker", "password", "password123", "postgres", "xeniway"].includes(password);
    return isLocalHost && isFixturePassword;
  } catch {
    return false;
  }
}

function isReviewedLocaleLabel(path: string, keyPath: readonly string[], value: string): boolean {
  const labels = reviewedLocaleLabels.get(path);
  if (!labels) {
    return false;
  }

  return labels.get(keyPath.join(".")) === value;
}

function containsJsonCredential(path: string, value: unknown, keyPath: readonly string[] = []): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsJsonCredential(path, item, keyPath));
  }

  if (typeof value !== "object" || value === null) {
    return false;
  }

  return Object.entries(value).some(([key, child]) => {
    const childPath = [...keyPath, key];
    if (typeof child === "string" && credentialKeyPattern.test(key)) {
      const isReviewedLabel = isReviewedLocaleLabel(path, childPath, child);
      return !isReviewedLabel && !isPlaceholderCredential(child);
    }

    return containsJsonCredential(path, child, childPath);
  });
}

function containsNonPlaceholderCredential(path: string, content: string): boolean {
  if (!isCredentialBearingText(path)) {
    return false;
  }

  if (path.endsWith(".json")) {
    try {
      return containsJsonCredential(path, JSON.parse(content));
    } catch {
      // Keep the line-based fallback for malformed configuration JSON.
    }
  }

  return content.split(/\r?\n/).some((line) => {
    const match = credentialAssignmentPattern.exec(line);
    return match?.[2] !== undefined && !isPlaceholderCredential(match[2]);
  });
}

export function findContentFindings(path: string, content: string): Finding[] {
  const findings = contentRules.filter((rule) => rule.pattern.test(content)).map((rule) => ({ path, rule: rule.name }));

  if (containsNonPlaceholderCredential(path, content)) {
    findings.push({ path, rule: "non-placeholder-credential" });
  }

  return findings;
}

export function formatFinding(finding: Finding): string {
  const safePath = Array.from(finding.path, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || (codePoint >= 127 && codePoint <= 159)
      ? `\\u${codePoint.toString(16).padStart(4, "0")}`
      : character;
  }).join("");
  return `${safePath} — ${finding.rule}`;
}

function runGit(args: string[], cwd?: string): Uint8Array {
  const result = Bun.spawnSync(["git", ...args], {
    cwd,
    stderr: "pipe",
    stdout: "pipe",
  });

  if (result.exitCode !== 0) {
    throw new Error("Git command failed while checking the public repository.");
  }

  return result.stdout;
}

function decodeNullSeparated(output: Uint8Array): string[] {
  return new TextDecoder()
    .decode(output)
    .split("\0")
    .filter((value) => value.length > 0);
}

interface IndexEntry {
  oid: string;
  path: string;
  stage: string;
}

function parseIndexEntries(output: Uint8Array): IndexEntry[] {
  return decodeNullSeparated(output).map((record) => {
    const tabIndex = record.indexOf("\t");
    const metadata = record.slice(0, tabIndex).split(" ");
    if (tabIndex < 0 || metadata.length !== 3 || !/^[0-9a-f]+$/.test(metadata[1] ?? "")) {
      throw new Error("Git returned an unreadable index entry.");
    }
    return { oid: metadata[1], path: record.slice(tabIndex + 1), stage: metadata[2] };
  });
}

function isBinary(content: Uint8Array): boolean {
  return content.subarray(0, 8_000).includes(0);
}

export async function checkTrackedFiles(root?: string): Promise<Finding[]> {
  const repositoryRoot = root ?? new TextDecoder().decode(runGit(["rev-parse", "--show-toplevel"])).trim();
  const entries = parseIndexEntries(runGit(["ls-files", "--stage", "-z"], repositoryRoot));
  const blobs = new Map<string, Uint8Array>();
  const findings: Finding[] = [];

  for (const { oid, path, stage } of entries) {
    const pathFinding = findForbiddenPath(path);
    if (pathFinding) {
      findings.push(pathFinding);
    }

    if (stage !== "0") {
      findings.push({ path, rule: "git-index-conflict" });
    }

    const bytes = blobs.get(oid) ?? runGit(["cat-file", "blob", oid], repositoryRoot);
    blobs.set(oid, bytes);
    if (!isBinary(bytes)) {
      findings.push(...findContentFindings(path, new TextDecoder().decode(bytes)));
    }
  }

  return Array.from(new Map(findings.map((finding) => [`${finding.path}\0${finding.rule}`, finding])).values()).sort(
    (left, right) =>
      left.path === right.path ? left.rule.localeCompare(right.rule) : left.path.localeCompare(right.path),
  );
}

async function main(): Promise<void> {
  try {
    const findings = await checkTrackedFiles();
    if (findings.length === 0) {
      console.log("Public repository check passed.");
      return;
    }

    console.error(`Public repository check failed with ${findings.length} finding(s):`);
    for (const finding of findings) {
      console.error(formatFinding(finding));
    }
    process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Public repository check failed.");
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
