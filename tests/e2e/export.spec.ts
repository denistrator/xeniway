import { readFile } from "node:fs/promises";
import { type APIRequestContext, expect, test } from "@playwright/test";
import type { ApplicationResponse, AuthResponse, CsrfResponse } from "@xeniway/shared";
import { createRedisClient } from "../../apps/api/src/redis/client";
import {
  applicationHeaders,
  contactHeaders,
  csvRecords,
  csvRows,
  exportFiles,
  followUpHeaders,
} from "../support/export";

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  const redis = createRedisClient("redis://localhost:6379/15");
  await redis.connect();
  try {
    await redis.flushDb();
  } finally {
    await redis.close();
  }
});

async function registerExportAccount(request: APIRequestContext, prefix: string) {
  const bootstrap = await request.get("/api/auth/csrf");
  const registration = await request.post("/api/auth/register", {
    headers: { "x-csrf-token": ((await bootstrap.json()) as CsrfResponse).data.csrfToken },
    data: { email: `${prefix}-${crypto.randomUUID()}@example.com`, password: "password123" },
  });
  expect(registration.ok()).toBe(true);
  const auth = (await registration.json()) as AuthResponse;
  const headers = { "x-csrf-token": auth.data.csrfToken };
  expect((await request.post("/api/user/preferences/introduced", { headers })).ok()).toBe(true);
  return headers;
}

async function seedExportRecords(request: APIRequestContext, headers: Record<string, string>, prefix: string) {
  const ids: number[] = [];
  for (const board of ["active", "archive", "blacklist"] as const) {
    const created = await request.post("/api/applications", {
      headers,
      data: {
        company: `${prefix} ${board}`,
        position: "Engineer",
        salary: "PRIVATE SALARY",
        notes: 'Notes, with "quotes"\nand another line',
      },
    });
    expect(created.status()).toBe(201);
    const id = ((await created.json()) as ApplicationResponse).data.application.id;
    ids.push(id);
    const path = `/api/applications/${id}`;
    expect(
      (
        await request.put(`${path}/preparation`, {
          headers,
          data: { companyResearch: `${prefix} research`, talkingPoints: "=1+1" },
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await request.post(`${path}/contacts`, {
          headers,
          data: { name: `${prefix} contact ${board}`, role: "Recruiter", notes: "@SUM(A1)" },
        })
      ).status(),
    ).toBe(201);
    expect(
      (
        await request.post(`${path}/follow-ups`, {
          headers,
          data: { title: `${prefix} task ${board}`, dueDate: "2026-10-03", notes: "+1+1" },
        })
      ).status(),
    ).toBe(201);
    expect(
      (
        await request.post(`${path}/events`, {
          headers,
          data: { type: "note", title: "PRIVATE ACTIVITY", occurredAt: "2026-10-01T10:00:00.000Z" },
        })
      ).status(),
    ).toBe(201);
    if (board !== "active") {
      const transition = await request.post(`${path}/${board}`, { headers, data: {} });
      expect(transition.status(), await transition.text()).toBe(200);
    }
  }
  return ids;
}

test("downloads an owner-isolated ZIP with records from every board through Settings", async ({
  page,
  playwright,
  baseURL,
}) => {
  const headers = await registerExportAccount(page.request, "export-owner");
  const ids = await seedExportRecords(page.request, headers, "Owner");
  const other = await playwright.request.newContext({ baseURL });
  try {
    const otherHeaders = await registerExportAccount(other, "export-other");
    await seedExportRecords(other, otherHeaders, "Other");
    await page.goto("/settings");
    await expect(page.getByRole("banner").getByRole("button", { name: "Export package" })).toHaveCount(0);
    const button = page.getByRole("region", { name: "Export data" }).getByRole("button", { name: "Export package" });
    await expect(button).toBeEnabled();
    await button.focus();
    const downloaded = page.waitForEvent("download");
    await page.keyboard.press("Enter");
    const download = await downloaded;
    expect(download.suggestedFilename()).toMatch(/^xenia-way-export-\d{4}-\d{2}-\d{2}\.zip$/);
    expect(await download.failure()).toBeNull();
    const path = await download.path();
    expect(path).not.toBeNull();
    const files = exportFiles(new Uint8Array(await readFile(path as string)));
    expect(Object.keys(files).sort()).toEqual(["applications.csv", "contacts.csv", "follow-ups.csv"]);
    expect(csvRows(files["applications.csv"])[0]).toEqual(applicationHeaders);
    expect(csvRows(files["contacts.csv"])[0]).toEqual(contactHeaders);
    expect(csvRows(files["follow-ups.csv"])[0]).toEqual(followUpHeaders);
    const applications = csvRecords(files["applications.csv"]);
    expect(applications.map((row) => [row.Company, row.Board])).toEqual([
      ["Owner active", "active"],
      ["Owner archive", "archive"],
      ["Owner blacklist", "blacklist"],
    ]);
    for (const row of applications) {
      expect(row.Notes).toBe('Notes, with "quotes"\nand another line');
      expect(row["Company research"]).toBe("Owner research");
      expect(row["Talking points"]).toBe("'=1+1");
    }
    const contacts = csvRecords(files["contacts.csv"]);
    const tasks = csvRecords(files["follow-ups.csv"]);
    expect(contacts.map((row) => row.Name)).toEqual([
      "Owner contact active",
      "Owner contact archive",
      "Owner contact blacklist",
    ]);
    expect(tasks.map((row) => row.Title)).toEqual(["Owner task active", "Owner task archive", "Owner task blacklist"]);
    expect(contacts.map((row) => row["Application ID"])).toEqual(ids.map(String));
    expect(tasks.map((row) => row["Application ID"])).toEqual(ids.map(String));
    expect(contacts.map((row) => row.Notes)).toEqual(Array(3).fill("'@SUM(A1)"));
    expect(tasks.map((row) => row.Notes)).toEqual(Array(3).fill("'+1+1"));
    for (const csv of Object.values(files)) {
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv).not.toContain("Other");
      expect(csv).not.toContain("PRIVATE SALARY");
      expect(csv).not.toContain("PRIVATE ACTIVITY");
    }
  } finally {
    await other.dispose();
  }
});

test("announces an export error and permits retry without duplicate pending requests", async ({ page }) => {
  await registerExportAccount(page.request, "export-retry");
  await page.goto("/settings");
  const button = page.getByRole("button", { name: "Export package", exact: true });
  await expect(button).toBeEnabled();
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route("**/api/applications/export.zip", async (route) => {
    requests += 1;
    await gate;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "INTERNAL_SERVER_ERROR", message: "Export failed" } }),
    });
  });
  try {
    await button.click();
    const pending = page.getByRole("button", { name: "Exporting…", exact: true });
    await expect(pending).toBeDisabled();
    await page.keyboard.press("Enter");
    expect(requests).toBe(1);
  } finally {
    release();
  }
  await expect(page.getByRole("alert")).toHaveText("Export package failed. Please try again.");
  await page.unroute("**/api/applications/export.zip");
  const downloaded = page.waitForEvent("download");
  await button.click();
  const download = await downloaded;
  expect(await download.failure()).toBeNull();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
