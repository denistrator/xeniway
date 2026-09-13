const DEFAULT_TAIL_LINES = 60;

const sensitiveEnvironmentName =
  /(?:DATABASE_URL|REDIS_URL|SMTP_URL|MAIL_FROM|(?:[A-Z0-9_]*_)?(?:PASSWORD|PASSWD|SECRET|TOKEN|COOKIE|SESSION|CSRF|API_KEY|ACCESS_KEY|PRIVATE_KEY))/i;
const structuredValue = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^,}\s{[]+)/;
const sensitiveCookieSegments = new Set(["auth", "cookie", "csrf", "jwt", "session", "sid", "token", "xsrf"]);

interface TextRange {
  end: number;
  start: number;
}

interface StructuredProperty extends TextRange {
  name: string;
}

function redactedValue(value: string): string {
  const quote = value.startsWith('"') || value.startsWith("'") ? value[0] : "";
  return quote ? `${quote}[REDACTED]${quote}` : "[REDACTED]";
}

function normalizedNameParts(name: string): { compact: string; segments: string[] } {
  const segmented = name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  const segments = segmented.split(/[^a-z0-9]+/).filter(Boolean);
  return { compact: segments.join(""), segments };
}

function isSensitiveCookieName(name: string): boolean {
  const { compact, segments } = normalizedNameParts(name);
  return (
    /^__(?:host|secure)-/i.test(name) ||
    compact === "jwt" ||
    /(?:sessionid|sessid|token)$/.test(compact) ||
    segments.some((segment) => sensitiveCookieSegments.has(segment))
  );
}

function redactProperties(text: string, isSensitive: (name: string) => boolean): string {
  const field = new RegExp(`((?:["']?)([a-z0-9_.-]+)(?:["']?)\\s*[:=]\\s*)${structuredValue.source}`, "gi");
  return text.replace(field, (match, prefix: string, name: string, value: string) =>
    isSensitive(name) ? `${prefix}${redactedValue(value)}` : match,
  );
}

function quotedEnd(text: string, start: number, limit: number): number {
  const quote = text[start];
  let index = start + 1;
  while (index < limit) {
    if (text[index] === "\\") {
      index += 2;
    } else if (text[index] === quote) {
      return index + 1;
    } else {
      index += 1;
    }
  }
  return limit;
}

function structuredObjectRanges(text: string): TextRange[] {
  const ranges: TextRange[] = [];
  const starts: number[] = [];
  let index = 0;
  while (index < text.length) {
    if (text[index] === '"' || text[index] === "'") {
      index = quotedEnd(text, index, text.length);
    } else if (text[index] === "{") {
      starts.push(index);
      index += 1;
    } else if (text[index] === "}") {
      const start = starts.pop();
      if (start !== undefined) {
        ranges.push({ start, end: index });
      }
      index += 1;
    } else {
      index += 1;
    }
  }
  return ranges;
}

function skipWhitespace(text: string, start: number, limit: number): number {
  let index = start;
  while (index < limit && /\s/.test(text[index] ?? "")) {
    index += 1;
  }
  return index;
}

function propertyName(text: string, start: number, limit: number): { end: number; name: string } | undefined {
  if (text[start] === '"' || text[start] === "'") {
    const end = quotedEnd(text, start, limit);
    return end <= limit && text[end - 1] === text[start] ? { name: text.slice(start + 1, end - 1), end } : undefined;
  }

  let end = start;
  while (end < limit && /[a-z0-9_$.-]/i.test(text[end] ?? "")) {
    end += 1;
  }
  return end > start ? { name: text.slice(start, end), end } : undefined;
}

function propertyValueEnd(text: string, start: number, limit: number): number {
  const closing = new Map([
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
  ]);
  const expectedClosings: string[] = [];
  let index = start;
  while (index < limit) {
    const character = text[index] ?? "";
    if (character === '"' || character === "'") {
      index = quotedEnd(text, index, limit);
      continue;
    }
    const expectedClosing = closing.get(character);
    if (expectedClosing) {
      expectedClosings.push(expectedClosing);
    } else if (expectedClosings.at(-1) === character) {
      expectedClosings.pop();
    } else if (character === "," && expectedClosings.length === 0) {
      break;
    }
    index += 1;
  }
  while (index > start && /\s/.test(text[index - 1] ?? "")) {
    index -= 1;
  }
  return index;
}

function structuredProperties(text: string, object: TextRange): StructuredProperty[] {
  const properties: StructuredProperty[] = [];
  let index = object.start + 1;
  while (index < object.end) {
    index = skipWhitespace(text, index, object.end);
    if (text[index] === ",") {
      index += 1;
      continue;
    }

    const property = propertyName(text, index, object.end);
    if (!property) {
      index += 1;
      continue;
    }
    const delimiter = skipWhitespace(text, property.end, object.end);
    if (text[delimiter] !== ":" && text[delimiter] !== "=") {
      index = property.end;
      continue;
    }

    const start = skipWhitespace(text, delimiter + 1, object.end);
    const end = propertyValueEnd(text, start, object.end);
    properties.push({ name: property.name, start, end });
    index = end;
  }
  return properties;
}

function nonOverlappingRanges(ranges: TextRange[]): TextRange[] {
  const selected: TextRange[] = [];
  for (const range of ranges.sort((left, right) => left.start - right.start || right.end - left.end)) {
    const containing = selected.at(-1);
    if (!containing || range.start >= containing.end) {
      selected.push(range);
    }
  }
  return selected;
}

function redactStructuredCookies(output: string): string {
  const redactions: TextRange[] = [];
  for (const object of structuredObjectRanges(output)) {
    const properties = structuredProperties(output, object);
    const hasNameValuePair =
      properties.some((property) => property.name.toLowerCase() === "name") &&
      properties.some((property) => property.name.toLowerCase() === "value");
    for (const property of properties) {
      if ((hasNameValuePair && property.name.toLowerCase() === "value") || /^__(?:host|secure)-/i.test(property.name)) {
        redactions.push(property);
      }
    }
  }

  let recordsRedacted = output;
  for (const range of nonOverlappingRanges(redactions).reverse()) {
    recordsRedacted = `${recordsRedacted.slice(0, range.start)}${redactedValue(
      recordsRedacted.slice(range.start, range.end),
    )}${recordsRedacted.slice(range.end)}`;
  }

  return redactProperties(recordsRedacted, isSensitiveCookieName);
}

function sanitizeLine(line: string): string {
  if (
    /password reset requested|reset your password|we received a request to reset|this link expires|password reset mail/i.test(
      line,
    )
  ) {
    return "Password reset mail: [REDACTED]";
  }

  const environmentAssignment = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*[:=]/i);
  if (environmentAssignment?.[1] && sensitiveEnvironmentName.test(environmentAssignment[1])) {
    return `${environmentAssignment[1]}=[REDACTED]`;
  }

  const sensitiveHeader = line.match(/^\s*(set-cookie|cookie|authorization|x-csrf-token)\s*:/i);
  if (sensitiveHeader?.[1]) {
    return `${sensitiveHeader[1]}: [REDACTED]`;
  }

  return redactProperties(line, (name) => ["password", "secret", "token"].includes(name.toLowerCase()))
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'`<>]+/gi, "[REDACTED_URL]")
    .replace(/\/reset-password\?[^\s"'`<>]+/gi, "/reset-password?[REDACTED]")
    .replace(/\b(?:Bearer|Basic)\s+[^\s"'`<>]+/gi, "[REDACTED_AUTHORIZATION]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/([?&](?:token|code|secret|session|csrf)=)[^&\s"'`<>]+/gi, "$1[REDACTED]");
}

export function sanitizeCiOutput(output: string, environment: Record<string, string | undefined> = {}): string {
  const sensitiveValues = Object.entries(environment)
    .filter(([name, value]) => sensitiveEnvironmentName.test(name) && Boolean(value) && (value?.length ?? 0) >= 4)
    .map(([, value]) => value as string)
    .sort((left, right) => right.length - left.length);
  const environmentRedacted = sensitiveValues.reduce(
    (sanitized, value) => sanitized.split(value).join("[REDACTED_ENV_VALUE]"),
    output,
  );
  const structuredCookiesRedacted = redactStructuredCookies(environmentRedacted);
  return structuredCookiesRedacted.split(/\r?\n/).map(sanitizeLine).join("\n");
}

export function tailLines(output: string, count = DEFAULT_TAIL_LINES): string {
  return output.split(/\r?\n/).slice(-count).join("\n");
}

function main(): never {
  const [stepName, executable, ...args] = process.argv.slice(2);
  if (!stepName || !executable) {
    console.error("CI check runner requires a step name and command.");
    process.exit(2);
  }

  const result = Bun.spawnSync([executable, ...args], {
    env: process.env,
    stderr: "pipe",
    stdout: "pipe",
  });
  const exitCode = result.exitCode ?? 1;

  if (exitCode === 0) {
    console.log(`${stepName} passed.`);
    process.exit(0);
  }

  const combinedOutput = `${result.stdout.toString()}\n${result.stderr.toString()}`.trim();
  const sanitizedTail = tailLines(sanitizeCiOutput(combinedOutput, process.env)).trim();
  console.error(`${stepName} failed with exit status ${exitCode}.`);
  if (sanitizedTail) {
    console.error("--- sanitized diagnostic tail ---");
    console.error(sanitizedTail);
    console.error("--- end sanitized diagnostic tail ---");
  }
  process.exit(exitCode);
}

if (import.meta.main) {
  main();
}
