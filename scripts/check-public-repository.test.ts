import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkTrackedFiles,
  type Finding,
  findContentFindings,
  findForbiddenPath,
  formatFinding,
} from "./check-public-repository";

const assemble = (...parts: string[]): string => parts.join("");

describe("public repository path checks", () => {
  it.each([
    [".env", "tracked-env-file"],
    ["apps/api/.env.production", "tracked-env-file"],
    ["certs/server.pem", "private-key-or-certificate"],
    ["certs/server.key", "private-key-or-certificate"],
    ["config/credentials.json", "credential-file"],
    ["config/credentials-prod.json", "credential-file"],
    ["config/credentials_staging.yaml", "credential-file"],
    ["config/service-account-prod.json", "credential-file"],
    ["config/service_account_prod.json", "credential-file"],
    [".aws/credentials", "credential-file"],
    ["node_modules/pkg/index.js", "dependency-directory"],
    ["apps/web/dist/index.html", "build-output"],
    ["playwright-report/index.html", "playwright-output"],
    ["test-results/results.json", "playwright-output"],
    [".idea/workspace.xml", "ide-metadata"],
    [".vscode/settings.json", "ide-metadata"],
    [".settings/preferences.xml", "ide-metadata"],
    [".vs/project/config.json", "ide-metadata"],
    [".project", "ide-metadata"],
    [".worktrees/task/HEAD", "worktree-metadata"],
    ["worktrees/task/HEAD", "worktree-metadata"],
    ["backups/production.dump", "database-dump"],
    ["backups/production.sql.gz", "database-dump"],
    ["backups/production.pgdump", "database-dump"],
    ["production.sql", "database-dump"],
    ["prod-2026-09-13.sql", "database-dump"],
    ["staging.sql", "database-dump"],
    ["database.sql", "database-dump"],
    ["db-2026-09-13.sql", "database-dump"],
  ])("rejects %s as %s", (path, rule) => {
    expect(findForbiddenPath(path)).toEqual({ path, rule });
  });

  it.each([".env.example", "apps/api/drizzle/0000_create_xeniway.sql", "docs/database.md", "src/key-handler.ts"])(
    "allows expected public path %s",
    (path) => {
      expect(findForbiddenPath(path)).toBeNull();
    },
  );
});

describe("public repository content checks", () => {
  it.each([
    ["private-key-header", assemble("-----BEGIN ", "OPENSSH PRIVATE KEY-----")],
    ["private-key-header", assemble("-----BEGIN PGP ", "PRIVATE KEY BLOCK-----")],
    ["aws-access-token", assemble("AKIA", "A".repeat(16))],
    ["github-token", assemble("ghp_", "a".repeat(36))],
    ["github-token", assemble("github_pat_", "a".repeat(22), "_", "b".repeat(59))],
    ["google-api-key", assemble("AI", "za", "A".repeat(35))],
    ["slack-token", assemble("xoxb-", "1234567890-1234567890-", "a".repeat(24))],
    ["stripe-live-secret", assemble("sk_", "live_", "a".repeat(24))],
  ])("detects %s without retaining matched content", (rule, content) => {
    expect(findContentFindings("config/example.txt", content)).toEqual([{ path: "config/example.txt", rule }]);
  });

  it("detects static non-placeholder credentials in configuration and documentation", () => {
    expect(findContentFindings("deploy/config.yml", "API_TOKEN: company-production-token-9472")).toEqual([
      { path: "deploy/config.yml", rule: "non-placeholder-credential" },
    ]);
    expect(
      findContentFindings("docs/setup.md", "DATABASE_URL=postgres://service:real-password@database.internal:5432/app"),
    ).toEqual([{ path: "docs/setup.md", rule: "non-placeholder-credential" }]);
  });

  it("allows explicit placeholders, environment references, and local development credentials", () => {
    const content = [
      "API_TOKEN=<replace-me>",
      `CLIENT_SECRET=\${CLIENT_SECRET}`,
      `password: \${{ secrets.TEST_PASSWORD }}`,
      '"password": "password123"',
      "POSTGRES_PASSWORD=xeniway",
      "POSTGRES_PASSWORD=job_tracker",
      "POSTGRES_PASSWORD=postgres",
      "DATABASE_URL=postgres://xeniway:xeniway@localhost:5432/xeniway",
    ].join("\n");

    expect(findContentFindings(".env.example", content)).toEqual([]);
  });

  it.each([
    "API_TOKEN=prefix-example-production",
    "CLIENT_SECRET=notlocal-but-real",
    "PASSWORD=fake-but-real-credential",
    "API_TOKEN=<replace-me>-production",
    `API_TOKEN=\${API_TOKEN}-suffix`,
    "CLIENT_SECRET=xeniway-production-secret",
    "PASSWORD=password987654321",
    "DATABASE_URL=postgres://admin:production-secret@localhost:5432/app",
  ])("does not exempt placeholder-like substrings in %s", (content) => {
    expect(findContentFindings("deploy/config.yml", content)).toEqual([
      { path: "deploy/config.yml", rule: "non-placeholder-credential" },
    ]);
  });

  it("reports each rule at most once per path", () => {
    const content = [assemble("AKIA", "A".repeat(16)), assemble("AKIA", "B".repeat(16))].join("\n");

    expect(findContentFindings("config.txt", content)).toEqual([{ path: "config.txt", rule: "aws-access-token" }]);
  });
});

describe("tracked-file integration", () => {
  it("checks index blobs while ignoring unstaged and untracked content", async () => {
    const repository = await mkdtemp(join(tmpdir(), "xeniway-public-check-"));

    try {
      expect(Bun.spawnSync(["git", "init", "--quiet"], { cwd: repository }).exitCode).toBe(0);
      await mkdir(join(repository, "nested"));
      await writeFile(join(repository, "safe.txt"), "public content\n");
      await writeFile(join(repository, "nested/.env.local"), "API_TOKEN=<replace-me>\n");
      await writeFile(join(repository, "untracked.pem"), assemble("-----BEGIN ", "OPENSSH PRIVATE KEY-----\n"));
      await symlink("untracked.pem", join(repository, "linked-config.txt"));
      await writeFile(join(repository, "staged-config.txt"), assemble("AKIA", "A".repeat(16), "\n"));
      await writeFile(join(repository, "working-config.txt"), "public content\n");
      expect(
        Bun.spawnSync(
          [
            "git",
            "add",
            "safe.txt",
            "nested/.env.local",
            "linked-config.txt",
            "staged-config.txt",
            "working-config.txt",
          ],
          { cwd: repository },
        ).exitCode,
      ).toBe(0);
      await writeFile(join(repository, "staged-config.txt"), "public content\n");
      await writeFile(join(repository, "working-config.txt"), assemble("AKIA", "B".repeat(16), "\n"));

      expect(await checkTrackedFiles(repository)).toEqual([
        { path: "nested/.env.local", rule: "tracked-env-file" },
        { path: "staged-config.txt", rule: "aws-access-token" },
      ]);
    } finally {
      await rm(repository, { force: true, recursive: true });
    }
  });
});

describe("finding output", () => {
  it("contains only the path and rule name", () => {
    const finding: Finding = { path: "config/credentials.txt", rule: "non-placeholder-credential" };
    const output = formatFinding(finding);

    expect(output).toBe("config/credentials.txt — non-placeholder-credential");
    expect(output).not.toContain("company-production-token-9472");
  });

  it("escapes control characters in tracked paths", () => {
    expect(formatFinding({ path: "config\nunsafe.txt", rule: "tracked-file-unreadable" })).toBe(
      "config\\u000aunsafe.txt — tracked-file-unreadable",
    );
  });
});
