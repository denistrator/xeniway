import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

test("publishes a search description and crawler policy", async () => {
  const html = await readFile("apps/web/index.html", "utf8");
  const robots = await readFile("apps/web/public/robots.txt", "utf8");
  const llms = await readFile("apps/web/public/llms.txt", "utf8");

  expect(html).toContain(
    '<meta name="description" content="Xenia Way is a private workspace for tracking job applications, employer conversations, follow-ups, and outcomes." />',
  );
  expect(robots).toBe("User-agent: *\nAllow: /\n");
  expect(llms).toContain("# Xenia Way");
  expect(llms).toMatch(/\[[^\]]+\]\(https?:\/\/[^)]+\)/);
});

test("declares browser favicons backed by valid small image assets", async () => {
  const html = await readFile("apps/web/index.html", "utf8");
  expect(html).toContain('<link rel="icon" type="image/x-icon" href="/favicon.ico" sizes="32x32" />');
  expect(html).toContain('<link rel="icon" type="image/png" href="/favicon.png" sizes="64x64" />');

  const png = await readFile("apps/web/public/favicon.png");
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(64);
  expect(png.readUInt32BE(20)).toBe(64);

  const ico = await readFile("apps/web/public/favicon.ico");
  expect(ico.readUInt16LE(0)).toBe(0);
  expect(ico.readUInt16LE(2)).toBe(1);
  expect(ico.readUInt16LE(4)).toBeGreaterThan(0);
  expect(ico[6]).toBe(32);
  expect(ico[7]).toBe(32);
});
