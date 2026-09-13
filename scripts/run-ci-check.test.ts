import { describe, expect, test } from "bun:test";
import { sanitizeCiOutput, tailLines } from "./run-ci-check";

describe("CI output sanitization", () => {
  test("redacts service URLs, environment values, reset links, cookies, and mail content", () => {
    const output = [
      "DATABASE_URL=postgres://candidate:database-password@db.internal:5432/xeniway",
      "REDIS_URL: redis://default:redis-password@redis.internal:6379",
      "Password reset requested for candidate@example.com: https://app.example.com/reset-password?token=raw-token",
      "Set-Cookie: session=raw-session; HttpOnly; SameSite=Lax",
      "Authorization: Bearer raw-bearer-token",
      "MAIL_FROM=Xenia Way <candidate@example.com>",
      "Error: connection refused",
      "    at apps/api/src/db/migrate.ts:12:3",
    ].join("\n");

    const sanitized = sanitizeCiOutput(output);

    for (const sensitiveValue of [
      "database-password",
      "redis-password",
      "candidate@example.com",
      "raw-token",
      "raw-session",
      "raw-bearer-token",
      "postgres://",
      "redis://",
      "https://",
    ]) {
      expect(sanitized).not.toContain(sensitiveValue);
    }
    expect(sanitized).toContain("DATABASE_URL=[REDACTED]");
    expect(sanitized).toContain("Password reset mail: [REDACTED]");
    expect(sanitized).toContain("Error: connection refused");
    expect(sanitized).toContain("apps/api/src/db/migrate.ts:12:3");
  });

  test("retains only the requested tail", () => {
    expect(tailLines("one\ntwo\nthree\nfour", 2)).toBe("three\nfour");
  });

  test("redacts opaque values from sensitive environment keys", () => {
    const sanitized = sanitizeCiOutput("Unexpected value opaque-runtime-value", {
      SERVICE_TOKEN: "opaque-runtime-value",
    });

    expect(sanitized).toBe("Unexpected value [REDACTED_ENV_VALUE]");
  });

  test("redacts values from structured cookie records", () => {
    const output = [
      'browser cookie: {"name":"session_id","value":"json-cookie-secret","path":"/applications"}',
      "cookie jar entry: { name: 'auth_session', value: 'object-cookie-secret', secure: true }",
      'reversed cookie record: { value: "leading-cookie-secret", name: "csrf_cookie" }',
    ].join("\n");

    const sanitized = sanitizeCiOutput(output);

    for (const sensitiveValue of ["json-cookie-secret", "object-cookie-secret", "leading-cookie-secret"]) {
      expect(sanitized).not.toContain(sensitiveValue);
    }
    expect(sanitized).toContain('"name":"session_id"');
    expect(sanitized).toContain('"path":"/applications"');
    expect(sanitized).toContain("secure: true");
  });

  test("redacts values keyed by cookie names while retaining adjacent diagnostics", () => {
    const output = [
      '{"session_id":"keyed-json-secret","status":"expired"}',
      "request state: { csrf_cookie: 'keyed-object-secret', retry: 2 }",
    ].join("\n");

    const sanitized = sanitizeCiOutput(output);

    expect(sanitized).not.toContain("keyed-json-secret");
    expect(sanitized).not.toContain("keyed-object-secret");
    expect(sanitized).toContain('"status":"expired"');
    expect(sanitized).toContain("retry: 2");
  });

  test("redacts pretty-printed cookie records with segmented, compact, and camel-case names", () => {
    const cookieValues = ["session-id-secret", "sessionid-secret", "csrftoken-secret", "auth-token-secret"];
    const output = [
      "browser cookies:",
      "{",
      '  "name": "session_id",',
      `  "value": "${cookieValues[0]}",`,
      '  "path": "/applications"',
      "}",
      "{",
      `  value: '${cookieValues[1]}',`,
      "  name: 'sessionid',",
      "  secure: true",
      "}",
      "{",
      '  "name": "csrftoken",',
      `  "value": "${cookieValues[2]}",`,
      '  "sameSite": "Lax"',
      "}",
      "{",
      "  name: 'authToken',",
      `  value: '${cookieValues[3]}',`,
      "  expires: 0",
      "}",
      "Error: browser context failed",
      "    at tests/e2e/xeniway.spec.ts:32:5",
    ].join("\n");

    const sanitized = sanitizeCiOutput(output);

    for (const sensitiveValue of cookieValues) {
      expect(sanitized).not.toContain(sensitiveValue);
    }
    expect(sanitized).toContain('"path": "/applications"');
    expect(sanitized).toContain("secure: true");
    expect(sanitized).toContain('"sameSite": "Lax"');
    expect(sanitized).toContain("expires: 0");
    expect(sanitized).toContain("Error: browser context failed");
    expect(sanitized).toContain("tests/e2e/xeniway.spec.ts:32:5");
  });

  test("redacts compact and camel-case cookie-name properties", () => {
    const output = [
      '{"sessionid":"compact-session-secret","status":"expired"}',
      "request state: { csrftoken: 'compact-csrf-secret', authToken: 'camel-auth-secret', retry: 3 }",
    ].join("\n");

    const sanitized = sanitizeCiOutput(output);

    expect(sanitized).not.toContain("compact-session-secret");
    expect(sanitized).not.toContain("compact-csrf-secret");
    expect(sanitized).not.toContain("camel-auth-secret");
    expect(sanitized).toContain('"status":"expired"');
    expect(sanitized).toContain("retry: 3");
  });

  test("redacts multiline name/value cookie records regardless of cookie-name convention", () => {
    const cookieRecords = [
      ["JSESSIONID", "java-session-secret"],
      ["PHPSESSID", "php-session-secret"],
      ["jwt", "jwt-cookie-secret"],
      ["XSRF-TOKEN", "xsrf-cookie-secret"],
      ["__Host-session", "host-cookie-secret"],
      ["connect.sid", "connect-cookie-secret"],
      ["sid", "sid-cookie-secret"],
      ["opaqueFrameworkState", "future-cookie-secret"],
    ];
    const output = cookieRecords
      .flatMap(([name, value], index) => [
        "{",
        `  "name": "${name}",`,
        `  "value": "${value}",`,
        `  "path": "/diagnostics/${index}",`,
        '  "secure": true',
        "}",
      ])
      .concat("Error: browser cookie inspection failed")
      .join("\n");

    const sanitized = sanitizeCiOutput(output);

    for (const [name, sensitiveValue] of cookieRecords) {
      expect(sanitized).toContain(`"name": "${name}"`);
      expect(sanitized).not.toContain(sensitiveValue);
    }
    expect(sanitized).toContain('"path": "/diagnostics/7"');
    expect(sanitized).toContain('"secure": true');
    expect(sanitized).toContain("Error: browser cookie inspection failed");
  });

  test("redacts conventional cookie-name properties case-insensitively", () => {
    const cookieValues = [
      "direct-java-secret",
      "direct-php-secret",
      "direct-jwt-secret",
      "direct-xsrf-secret",
      "direct-host-secret",
      "direct-connect-secret",
      "direct-sid-secret",
    ];
    const output = [
      `{ "JSESSIONID": "${cookieValues[0]}", "PHPSESSID": "${cookieValues[1]}", status: "expired" }`,
      `{ jwt: "${cookieValues[2]}", "XSRF-TOKEN": "${cookieValues[3]}", retry: 4 }`,
      `{ "__Host-session": "${cookieValues[4]}", "connect.sid": "${cookieValues[5]}", sid: "${cookieValues[6]}" }`,
    ].join("\n");

    const sanitized = sanitizeCiOutput(output);

    for (const sensitiveValue of cookieValues) {
      expect(sanitized).not.toContain(sensitiveValue);
    }
    expect(sanitized).toContain('status: "expired"');
    expect(sanitized).toContain("retry: 4");
  });

  test("recursively redacts nested cookie records with reversed name/value order", () => {
    const cookieValues = ["nested-reversed-secret", "outer-nested-secret"];
    const output = [
      "browser state:",
      "{",
      '  "event": "cookie-snapshot",',
      '  "metadata": {',
      '    "cookie": {',
      `      "value": "${cookieValues[0]}",`,
      '      "details": { "path": "/applications", "httpOnly": true },',
      '      "name": "opaqueInnerCredential"',
      "    },",
      '    "attempt": 2',
      "  },",
      '  "diagnostic": "retained"',
      "}",
      "{",
      "  name: 'opaqueOuterCredential',",
      "  metadata: { source: 'browser', details: { retry: 5 } },",
      `  value: '${cookieValues[1]}'`,
      "}",
      "Error: browser cookie inspection failed",
    ].join("\n");

    const sanitized = sanitizeCiOutput(output);

    for (const sensitiveValue of cookieValues) {
      expect(sanitized).not.toContain(sensitiveValue);
    }
    expect(sanitized).toContain('"name": "opaqueInnerCredential"');
    expect(sanitized).toContain('"path": "/applications"');
    expect(sanitized).toContain('"httpOnly": true');
    expect(sanitized).toContain("details: { retry: 5 }");
    expect(sanitized).toContain('"diagnostic": "retained"');
    expect(sanitized).toContain("Error: browser cookie inspection failed");
  });

  test("redacts unfamiliar direct properties with host and secure prefixes case-insensitively", () => {
    const cookieValues = ["host-prefix-secret", "secure-prefix-secret", "uppercase-prefix-secret"];
    const output = [
      `{ "__Host-opaqueState": "${cookieValues[0]}", status: "expired" }`,
      `{ '__Secure-futureCredential': '${cookieValues[1]}', retry: 6 }`,
      `{ "__HOST-UNFAMILIAR": "${cookieValues[2]}", diagnostic: "retained" }`,
    ].join("\n");

    const sanitized = sanitizeCiOutput(output);

    for (const sensitiveValue of cookieValues) {
      expect(sanitized).not.toContain(sensitiveValue);
    }
    expect(sanitized).toContain('status: "expired"');
    expect(sanitized).toContain("retry: 6");
    expect(sanitized).toContain('diagnostic: "retained"');
  });
});

describe("CI check runner", () => {
  test("reports the step and exit status with sanitized diagnostics", () => {
    const result = Bun.spawnSync(
      [
        "bun",
        "scripts/run-ci-check.ts",
        "Focused check",
        "bun",
        "-e",
        'console.error("DATABASE_URL=postgres://user:password@localhost/db\\nError: migration failed"); process.exit(7)',
      ],
      { stderr: "pipe", stdout: "pipe" },
    );
    const output = `${result.stdout.toString()}${result.stderr.toString()}`;

    expect(result.exitCode).toBe(7);
    expect(output).toContain("Focused check failed with exit status 7.");
    expect(output).toContain("Error: migration failed");
    expect(output).not.toContain("postgres://");
    expect(output).not.toContain("user:password");
  });

  test("sanitizes multiline cookie records before retaining the diagnostic tail", () => {
    const cookieValue = "tail-boundary-cookie-secret";
    const childScript = [
      'const lines = ["{", "  \\"name\\": \\"sessionid\\",", "  \\"value\\": \\"" + process.argv[1] + "\\",", "}"];',
      'for (let index = 0; index < 58; index += 1) lines.push("Diagnostic " + index);',
      'console.error(lines.join("\\n"));',
      "process.exit(9);",
    ].join(" ");
    const result = Bun.spawnSync(
      ["bun", "scripts/run-ci-check.ts", "Tail check", "bun", "-e", childScript, cookieValue],
      { stderr: "pipe", stdout: "pipe" },
    );
    const output = `${result.stdout.toString()}${result.stderr.toString()}`;

    expect(result.exitCode).toBe(9);
    expect(output).not.toContain(cookieValue);
    expect(output).toContain("Diagnostic 57");
  });

  test("sanitizes nested cookie records before the name falls outside the diagnostic tail", () => {
    const cookieValue = "nested-tail-boundary-secret";
    const childScript = [
      'const lines = ["{", "  \\"name\\": \\"opaqueTailState\\",", "  \\"metadata\\": {", "    \\"trace\\": \\"retained\\"", "  },", "  \\"value\\": \\"" + process.argv[1] + "\\"", "}"];',
      'for (let index = 0; index < 56; index += 1) lines.push("Diagnostic " + index);',
      'console.error(lines.join("\\n"));',
      "process.exit(10);",
    ].join(" ");
    const result = Bun.spawnSync(
      ["bun", "scripts/run-ci-check.ts", "Nested tail check", "bun", "-e", childScript, cookieValue],
      { stderr: "pipe", stdout: "pipe" },
    );
    const output = `${result.stdout.toString()}${result.stderr.toString()}`;

    expect(result.exitCode).toBe(10);
    expect(output).not.toContain(cookieValue);
    expect(output).toContain('"trace": "retained"');
    expect(output).toContain("Diagnostic 55");
  });
});
