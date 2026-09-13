import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

test("publishes a search description and crawler policy", async () => {
  const html = await readFile("apps/web/index.html", "utf8");
  const robots = await readFile("apps/web/public/robots.txt", "utf8");

  expect(html).toContain(
    '<meta name="description" content="Xenia Way is a private workspace for tracking job applications, employer conversations, follow-ups, and outcomes." />',
  );
  expect(robots).toBe("User-agent: *\nAllow: /\n");
});
