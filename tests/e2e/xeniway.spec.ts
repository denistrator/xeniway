import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import type { ApplicationResponse, AuthResponse, CsrfResponse } from "@xeniway/shared";
import { createRedisClient } from "../../apps/api/src/redis/client";

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

async function setBrowserPreferences(
  page: Page,
  preferences: { theme: "light" | "dark" | "system"; language: "en" | "ru" | "uk" | "he" },
) {
  await page.goto("/about");
  await page.evaluate((value) => {
    window.localStorage.setItem("userPreferences", JSON.stringify(value));
  }, preferences);
  await page.reload();
}

test("provides public password recovery pages", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await page.getByLabel("Email").fill("unknown@example.com");
  await page.getByRole("button", { name: "Send instructions" }).click();
  await expect(page.getByRole("status")).toContainText("If an account exists for that email");

  await page.goto("/reset-password?token=invalid-token");
  await page.getByLabel("New password").fill("password123");
  await page.getByLabel("Confirm password").fill("password123");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("alert")).toContainText("invalid or expired");
});

test("shows the about page without authentication", async ({ page }) => {
  await page.goto("/about");

  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: "A clear workspace for a complicated job search." })).toBeVisible();
});

for (const authenticated of [false, true]) {
  test(`checks the session once on ${authenticated ? "authenticated" : "signed-out"} page load`, async ({ page }) => {
    if (authenticated) {
      const csrf = await page.request.get("/api/auth/csrf");
      const csrfToken = ((await csrf.json()) as { data: { csrfToken: string } }).data.csrfToken;
      const login = await page.request.post("/api/auth/login", {
        headers: { "x-csrf-token": csrfToken },
        data: { email: "admin@example.com", password: "password" },
      });
      expect(login.ok()).toBe(true);
    }

    let sessionRequests = 0;
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/auth/me") sessionRequests += 1;
    });
    await page.goto("/");
    if (authenticated) {
      await expect(page.getByRole("button", { name: "Add job" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Applications", exact: true })).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    }
    expect(sessionRequests).toBe(1);

    await page.getByRole("link", { name: "About", exact: true }).click();
    await expect(page.getByRole("heading", { name: "A clear workspace for a complicated job search." })).toBeVisible();
    expect(sessionRequests).toBe(1);

    await page.reload();
    await expect(page.getByRole("heading", { name: "A clear workspace for a complicated job search." })).toBeVisible();
    await expect(
      page.getByRole(authenticated ? "button" : "link", { name: authenticated ? "Logout" : "Log in", exact: true }),
    ).toBeVisible();
    expect(sessionRequests).toBe(2);
  });
}

test("switches and persists the selected browser language", async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("e2e-preferences-reset")) return;
    localStorage.clear();
    sessionStorage.setItem("e2e-preferences-reset", "true");
  });
  await page.goto("/about");
  await page.getByRole("button", { name: "Language: English. Change language" }).click();
  await page.getByRole("menuitem", { name: "Russian" }).click();
  await page.getByRole("button", { name: "Language: Русский. Change language" }).click();
  await page.getByRole("menuitem", { name: "Украинский" }).click();
  await page.getByRole("button", { name: "Language: Українська. Change language" }).click();
  await page.getByRole("menuitem", { name: "Іврит" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "מרחב עבודה ברור לחיפוש עבודה מורכב." })).toBeVisible();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("button", { name: "Language: עברית. Change language" })).toBeVisible();
});

test("shows a public not found page for unknown routes", async ({ page }) => {
  await page.goto("/does-not-exist");

  await expect(page).toHaveURL(/\/does-not-exist$/);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to applications" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("link", { name: "About Xenia Way" })).toHaveAttribute("href", "/about");
  await expect(page.getByRole("button", { name: /Theme: .*\. Change theme/ })).toBeVisible();
});

test("uses floating labels for authentication fields", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator(".floating-label > input")).toHaveCount(2);
  await expect(page.locator(".floating-label-with-icon > svg")).toHaveCount(2);
  await expect(page.getByLabel("Email")).toHaveAttribute("placeholder", " ");
  await expect(page.getByLabel("Password")).toHaveAttribute("placeholder", " ");

  await page.goto("/register");
  await expect(page.locator(".floating-label > input")).toHaveCount(5);
  await expect(page.locator(".floating-label-with-icon > svg")).toHaveCount(5);
  for (const label of ["First name", "Last name", "Email", "Password", "Confirm password"]) {
    await expect(page.getByLabel(label, { exact: true })).toHaveAttribute("placeholder", " ");
  }
});

test("decorates workspace headings by status in light, dark, and narrow Hebrew layouts", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const bootstrap = await page.request.get("/api/auth/csrf");
  const bootstrapToken = ((await bootstrap.json()) as CsrfResponse).data.csrfToken;
  const registration = await page.request.post("/api/auth/register", {
    headers: { "x-csrf-token": bootstrapToken },
    data: { email: `status-decor-${Date.now()}@example.com`, password: "password123" },
  });
  expect(registration.ok()).toBe(true);
  const headers = { "x-csrf-token": ((await registration.json()) as AuthResponse).data.csrfToken };
  expect(
    (
      await page.request.patch("/api/user/preferences", {
        headers,
        data: { selectedLanguage: "en", selectedTheme: "light" },
      })
    ).ok(),
  ).toBe(true);
  expect((await page.request.post("/api/user/preferences/introduced", { headers })).ok()).toBe(true);
  const company = `Status decor ${Date.now()}`;
  const created = await page.request.post("/api/applications", {
    headers,
    data: { company, position: "Engineer", status: "saved" },
  });
  expect(created.ok()).toBe(true);
  const detailUrl = `/api/applications/${((await created.json()) as ApplicationResponse).data.application.id}`;
  const workspaceUrl = detailUrl.replace("/api", "");
  const headingBlock = page.locator('[data-compact-edit-field="status"]').locator("..");
  const marker = page.locator('[data-compact-edit-field="status"] > button > span');

  for (const status of ["saved", "applied", "interview", "offer", "rejected", "withdrawn"]) {
    expect((await page.request.put(detailUrl, { headers, data: { status } })).ok()).toBe(true);
    await page.goto(workspaceUrl);
    await expect(page.getByRole("heading", { name: company })).toBeFocused();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const lightMarker = await marker.evaluate((element) => getComputedStyle(element).backgroundColor);
    await expect(headingBlock).toHaveCSS("border-left-width", "4px");
    await expect(headingBlock).toHaveCSS("border-left-color", lightMarker);
    await expect(headingBlock).toHaveCSS("background-image", /linear-gradient\(to right/);
    await expectWorkspaceAccents(page);
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await expect
      .poll(() =>
        headingBlock.evaluate((element) => {
          const statusMarker = element.querySelector('[data-compact-edit-field="status"] > button > span');
          return (
            statusMarker !== null &&
            getComputedStyle(element).borderLeftColor === getComputedStyle(statusMarker).backgroundColor
          );
        }),
      )
      .toBe(true);
    await expectWorkspaceAccents(page);
  }

  // Return to the persisted theme before exercising the real status control.
  await page.reload();
  const statusTrigger = page.getByRole("button", { name: "Status, Change status" });
  await statusTrigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("radio", { name: "Withdrawn" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(statusTrigger).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByRole("radio", { name: "Offer", exact: true }).click();
  await expect(statusTrigger).toBeFocused();
  await expect(statusTrigger).toHaveText("Offer");
  await expect(headingBlock).toHaveClass(/border-s-emerald-600/);
  await expectWorkspaceAccents(page);
  await page.reload();
  await expect(statusTrigger).toHaveText("Offer");
  await page.screenshot({ path: test.info().outputPath("workspace-status-light.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Language: English. Change language" }).click();
  await page.getByRole("menuitem", { name: "Hebrew" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(headingBlock).toHaveCSS("border-right-width", "4px");
  await expect(headingBlock).toHaveCSS("border-left-width", "0px");
  await expect(headingBlock).toHaveCSS("background-image", /linear-gradient\(to left/);
  await expect(headingBlock).toHaveCSS("overflow", "visible");
  await expectWorkspaceAccents(page);
  const sectionTitle = page.locator(".workspace-section-title").first();
  expect(await sectionTitle.evaluate((element) => getComputedStyle(element, "::before").marginLeft)).toBe("8px");
  const overflow = await headingBlock.evaluate((element) => {
    const decoratedWidth = document.documentElement.scrollWidth;
    const originalClass = element.getAttribute("class");
    element.setAttribute("class", "grid gap-2");
    const undecoratedWidth = document.documentElement.scrollWidth;
    if (originalClass === null) {
      element.removeAttribute("class");
    } else {
      element.setAttribute("class", originalClass);
    }
    return {
      decoratedWidth,
      undecoratedWidth,
    };
  });
  // The existing site-header RTL overflow must not grow with workspace decoration.
  expect(overflow.decoratedWidth).toBeLessThanOrEqual(overflow.undecoratedWidth);
  const headingBounds = await headingBlock.boundingBox();
  expect(headingBounds).not.toBeNull();
  expect(headingBounds?.x).toBeGreaterThanOrEqual(0);
  expect((headingBounds?.x ?? 0) + (headingBounds?.width ?? 0)).toBeLessThanOrEqual(390);
  await headingBlock.getByRole("button").last().click();
  const menu = page.locator("#application-status-options");
  await expect(menu).toBeVisible();
  const bounds = await menu.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await page.screenshot({ path: test.info().outputPath("workspace-status-rtl.png"), fullPage: true });
  const accessibility = await new AxeBuilder({ page }).include("main").analyze();
  expect(accessibility.violations).toEqual([]);
  expect((await page.request.delete(detailUrl, { headers })).ok()).toBe(true);
});

async function expectWorkspaceAccents(page: Page) {
  await expect(page.locator(".workspace-metadata")).toHaveCSS("border-top-width", "2px");
  await expect(page.locator(".workspace-activity")).toHaveCSS("border-left-width", "1px");
  await expect
    .poll(() =>
      page.locator(".workspace-status-decor").evaluate((workspace) => {
        const marker = workspace.querySelector('[data-compact-edit-field="status"] > button > span');
        const metadata = workspace.querySelector(".workspace-metadata");
        if (!marker || !metadata) return false;
        const color = getComputedStyle(marker).backgroundColor;
        const titles = Array.from(workspace.querySelectorAll(".workspace-section-title"));
        return (
          getComputedStyle(metadata).borderTopColor === color &&
          titles.length === 6 &&
          titles.every((title) => {
            const decoration = getComputedStyle(title, "::before");
            return decoration.backgroundColor === color && decoration.width === "16px" && decoration.height === "2px";
          })
        );
      }),
    )
    .toBe(true);
}

test("shows the welcome popup after login and registration", async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("e2e-preferences-reset")) return;
    localStorage.clear();
    sessionStorage.setItem("e2e-preferences-reset", "true");
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();

  const welcome = page.getByRole("dialog");
  await expect(welcome).toBeVisible();
  await expect(welcome).toHaveAccessibleName("Welcome to Xenia Way");
  await expect(welcome.getByText("Xenia Way gives you one clear place")).toBeVisible();
  await welcome.getByRole("button", { name: "Language: English. Change language" }).click();
  await page.getByRole("menuitem", { name: "Russian" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(welcome).toHaveAccessibleName("Добро пожаловать в Xenia Way");
  await expect(welcome.getByRole("heading", { name: "Добро пожаловать в Xenia Way" })).toBeVisible();
  await welcome.getByRole("button", { name: "Language: Русский. Change language" }).click();
  await page.getByRole("menuitem", { name: "Украинский" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await welcome.getByRole("button", { name: "Language: Українська. Change language" }).click();
  await page.getByRole("menuitem", { name: "Іврит" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(welcome).toHaveAccessibleName("ברוכים הבאים ל־Xenia Way");
  await welcome.getByRole("button", { name: "Language: עברית. Change language" }).click();
  await page.getByRole("menuitem", { name: "אנגלית" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await welcome.getByRole("button", { name: "Close welcome introduction" }).last().click();
  await expect(welcome).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Welcome to Xenia Way" })).toHaveCount(0);

  await page.getByRole("button", { name: "Logout" }).click();
  await page.goto("/login");
  await page.getByLabel("Email").fill("test_user@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  const secondWelcome = page.getByRole("dialog", { name: "Welcome to Xenia Way" });
  await expect(secondWelcome).toBeVisible();
  await secondWelcome.getByRole("button", { name: "Close welcome introduction" }).last().click();
  await expect(secondWelcome).toHaveCount(0);

  await page.getByRole("button", { name: "Logout" }).click();
  await page.goto("/register");
  const email = `welcome-${Date.now()}@example.com`;
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel("Confirm password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  const registeredWelcome = page.getByRole("dialog", { name: "Welcome to Xenia Way" });
  await expect(registeredWelcome).toBeVisible();
  await registeredWelcome.getByRole("button", { name: "About Xenia Way" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(registeredWelcome).toHaveCount(0);
});

test("downloads the authenticated application data as CSV", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Email").fill(`csv-export-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel("Confirm password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  const welcome = page.getByRole("dialog", { name: "Welcome to Xenia Way" });
  await expect(welcome).toBeVisible();
  await welcome.getByRole("button", { name: "Close welcome introduction" }).last().click();

  const headerActionLabels = await page
    .locator("header button")
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-label") || button.textContent?.trim() || ""),
    );
  const addJobIndex = headerActionLabels.findIndex((label) => label.includes("Add job"));
  expect(headerActionLabels[addJobIndex + 1]).toBe("Export CSV");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(download.suggestedFilename()).toMatch(/^xenia-way-export-\d{4}-\d{2}-\d{2}\.csv$/);
  expect(downloadPath).not.toBeNull();
  if (!downloadPath) throw new Error("CSV download did not produce a local file");
  const csv = await readFile(downloadPath, "utf8");
  expect(csv).toContain('"company"');
  expect(csv).toContain('"activity"');
});

test("records and edits application activity across reloads", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Email").fill(`activity-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel("Confirm password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  const welcome = page.getByRole("dialog", { name: "Welcome to Xenia Way" });
  await expect(welcome).toBeVisible();
  await welcome.getByRole("button", { name: "Close welcome introduction" }).last().click();

  const company = `Activity Company ${Date.now()}`;
  await page.getByRole("button", { name: "Add job" }).click();
  await page.getByLabel("Company *").fill(company);
  await page.getByLabel("Position *").fill("Engineer");
  await page.getByRole("button", { name: "Save application" }).click();
  const detailResponse = page.waitForResponse(
    (response) =>
      /\/api\/applications\/\d+$/.test(new URL(response.url()).pathname) && response.request().method() === "GET",
  );
  await page.getByRole("button", { name: new RegExp(company) }).click();
  const detailResult = await detailResponse;
  const detailUrl = detailResult.url();
  const createdEvent = (
    (await detailResult.json()) as { data: { events: Array<{ id: number; type: string }> } }
  ).data.events.find((event) => event.type === "application_created");
  expect(createdEvent).toBeDefined();
  const csrfResult = await page.request.get("/api/auth/csrf");
  const csrfToken = ((await csrfResult.json()) as { data: { csrfToken: string } }).data.csrfToken;
  const immutableUpdate = await page.request.patch(`${detailUrl}/events/${createdEvent?.id}`, {
    headers: { "x-csrf-token": csrfToken },
    data: { title: "Tampered" },
  });
  expect(immutableUpdate.status()).toBe(404);

  await expect(page.getByRole("heading", { name: company })).toBeFocused();
  const activity = page.getByRole("list", { name: "Activity timeline" });
  await expect(activity).toContainText("Application created");
  const activityAxe = await new AxeBuilder({ page }).include("main").analyze();
  expect(activityAxe.violations).toEqual([]);
  await page.getByRole("button", { name: "Add activity" }).click();
  await expect(page.getByRole("combobox", { name: "Activity type" })).toBeFocused();
  await page.getByRole("combobox", { name: "Activity type" }).selectOption("follow_up");
  await page.getByRole("textbox", { name: "Title" }).fill("Contact recruiter");
  await page.getByRole("textbox", { name: "Description (optional)" }).fill("Send a short update");
  await page.getByRole("button", { name: "Save activity" }).click();
  await expect(activity).toContainText("Contact recruiter");
  await expect(page.getByRole("button", { name: "Add activity" })).toBeFocused();
  await page.getByRole("button", { name: /Change status/ }).click();
  await page.getByRole("radio", { name: "Applied" }).click();
  await page.reload();
  await expect(page.getByRole("list", { name: "Activity timeline" })).toContainText("Saved → Applied");
  await page.getByRole("button", { name: "Edit Contact recruiter" }).click();
  await expect(page.getByRole("combobox", { name: "Activity type" })).toBeFocused();
  await page.getByRole("textbox", { name: "Title" }).fill("Contact recruiter again");
  await page.getByRole("button", { name: "Save activity" }).click();
  await expect(page.getByText("Contact recruiter again")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Contact recruiter again" })).toBeFocused();
  await page.getByRole("button", { name: "Delete Contact recruiter again" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Delete Contact recruiter again" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Yes" }).click();
  await expect(page.getByText("Contact recruiter again")).toHaveCount(0);

  const archived = page.waitForResponse((response) => response.url().endsWith("/archive") && response.status() === 200);
  await page.getByRole("button", { name: "Archive application" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Archive application" }).click();
  await archived;
  const archivedDetail = await page.request.get(detailUrl);
  expect(archivedDetail.ok()).toBe(true);
  expect(
    ((await archivedDetail.json()) as { data: { events: Array<{ type: string }> } }).data.events.map(
      (event) => event.type,
    ),
  ).toContain("archived");
  await page.getByRole("link", { name: "Archive", exact: true }).click();
  const archivedCard = page.getByRole("heading", { name: company }).locator("xpath=../..");
  await archivedCard.getByRole("button", { name: "View activity" }).click();
  await expect(archivedCard.getByRole("list", { name: "Activity timeline" })).toContainText("Archived");
  const restored = page.waitForResponse((response) => response.url().endsWith("/restore") && response.status() === 200);
  await archivedCard.getByRole("button", { name: "Restore" }).click();
  await restored;
  const restoredDetail = await page.request.get(detailUrl);
  expect(
    ((await restoredDetail.json()) as { data: { events: Array<{ type: string }> } }).data.events.map(
      (event) => event.type,
    ),
  ).toContain("restored_from_archive");
  await page.getByRole("link", { name: "Applications", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(company) }).click();
  await page.getByRole("button", { name: "Add to blacklist" }).click();
  const blacklisted = page.waitForResponse(
    (response) => response.url().endsWith("/blacklist") && response.status() === 200,
  );
  await page.getByRole("alertdialog").getByRole("button", { name: "Add to blacklist" }).click();
  await blacklisted;
  const blacklistedDetail = await page.request.get(detailUrl);
  expect(
    ((await blacklistedDetail.json()) as { data: { events: Array<{ type: string }> } }).data.events.map(
      (event) => event.type,
    ),
  ).toContain("blacklisted");
  await page.getByRole("link", { name: "Blacklist", exact: true }).click();
  const blacklistedCard = page.getByRole("heading", { name: company }).locator("xpath=../..");
  await blacklistedCard.getByRole("button", { name: "View activity" }).click();
  await expect(blacklistedCard.getByRole("list", { name: "Activity timeline" })).toContainText("Blacklisted");
  const unblacklisted = page.waitForResponse(
    (response) => response.url().endsWith("/unblacklist") && response.status() === 200,
  );
  await blacklistedCard.getByRole("button", { name: "Restore" }).click();
  await unblacklisted;
  const unblacklistedDetail = await page.request.get(detailUrl);
  expect(
    ((await unblacklistedDetail.json()) as { data: { events: Array<{ type: string }> } }).data.events.map(
      (event) => event.type,
    ),
  ).toContain("restored_from_blacklist");

  const currentCsrf = await page.request.get("/api/auth/csrf");
  const currentToken = ((await currentCsrf.json()) as { data: { csrfToken: string } }).data.csrfToken;
  await page.request.post("/api/auth/logout", { headers: { "x-csrf-token": currentToken } });
  const anonymousCsrf = await page.request.get("/api/auth/csrf");
  const anonymousToken = ((await anonymousCsrf.json()) as { data: { csrfToken: string } }).data.csrfToken;
  const otherLogin = await page.request.post("/api/auth/login", {
    headers: { "x-csrf-token": anonymousToken },
    data: { email: "admin@example.com", password: "password" },
  });
  expect(otherLogin.ok()).toBe(true);
  const otherCsrf = await page.request.get("/api/auth/csrf");
  const otherToken = ((await otherCsrf.json()) as { data: { csrfToken: string } }).data.csrfToken;
  expect((await page.request.get(detailUrl)).status()).toBe(404);
  const foreignPreparation = await page.request.put(`${detailUrl}/preparation`, {
    headers: { "x-csrf-token": otherToken },
    data: { companyResearch: "Unauthorized update" },
  });
  expect(foreignPreparation.status()).toBe(404);
  const foreignContact = await page.request.post(`${detailUrl}/contacts`, {
    headers: { "x-csrf-token": otherToken },
    data: { name: "Unauthorized", role: "Access attempt" },
  });
  expect(foreignContact.status()).toBe(404);
});

test("syncs browser preferences with each authenticated account", async ({ page }) => {
  const accountA = `preferences-a-${Date.now()}@example.com`;
  const accountB = `preferences-b-${Date.now()}@example.com`;

  await setBrowserPreferences(page, { language: "uk", theme: "dark" });
  await page.goto("/register");
  await page.getByLabel("Ім’я").fill("Preference");
  await page.getByLabel("Прізвище").fill("Account A");
  await page.getByLabel("Електронна пошта").fill(accountA);
  await page.getByLabel("Пароль", { exact: true }).fill("password123");
  await page.getByLabel("Підтвердьте пароль").fill("password123");
  await page.getByRole("button", { name: "Створити обліковий запис" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const welcome = page.getByRole("dialog", { name: "Ласкаво просимо до Xenia Way" });
  await expect(welcome).toBeVisible();
  await welcome.getByRole("button", { name: "Перейти до дошки" }).click();
  await expect(page.getByRole("heading", { name: "Вакансії" })).toBeVisible();

  const accountATheme = page.getByRole("button", { name: "Theme: Dark. Change theme" });
  const accountALanguage = page.getByRole("banner").getByRole("button", {
    name: "Language: Українська. Change language",
  });
  await expect(accountATheme).toBeEnabled();
  await expect(accountALanguage).toBeEnabled();
  const accountAThemeUpdate = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/user/preferences") &&
      response.request().method() === "PATCH" &&
      response.status() === 200,
  );
  await accountATheme.click();
  await accountAThemeUpdate;
  const accountALanguageUpdate = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/user/preferences") &&
      response.request().method() === "PATCH" &&
      response.status() === 200,
  );
  await accountALanguage.click();
  const accountALanguageOption = page.getByRole("menuitem", { name: "Англійська" });
  await accountALanguageOption.click();
  await accountALanguageUpdate;
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("button", { name: "Logout" }).click();
  await page.goto("/register");
  await page.getByLabel("First name").fill("Preference");
  await page.getByLabel("Last name").fill("Account B");
  await page.getByLabel("Email").fill(accountB);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel("Confirm password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("dialog", { name: "Welcome to Xenia Way" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("dialog", { name: "Welcome to Xenia Way" }).getByRole("button", { name: "Go to board" }).click();

  const accountBTheme = page.getByRole("button", { name: "Theme: Light. Change theme" });
  const accountBLanguage = page.getByRole("banner").getByRole("button", {
    name: "Language: English. Change language",
  });
  await expect(accountBTheme).toBeEnabled();
  await expect(accountBLanguage).toBeEnabled();
  const accountBThemeUpdate = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/user/preferences") &&
      response.request().method() === "PATCH" &&
      response.status() === 200,
  );
  await accountBTheme.click();
  await accountBThemeUpdate;
  const accountBLanguageUpdate = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/user/preferences") &&
      response.request().method() === "PATCH" &&
      response.status() === 200,
  );
  await accountBLanguage.click();
  const accountBLanguageOption = page.getByRole("menuitem", { name: "Russian" });
  await accountBLanguageOption.click();
  await accountBLanguageUpdate;
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByRole("button", { name: "Theme: System. Change theme" })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByRole("button", { name: "Theme: System. Change theme" })).toBeVisible();

  await page.getByRole("button", { name: "Выйти" }).click();
  await page.goto("/login");
  await page.getByLabel("Электронная почта").fill(accountA);
  await page.getByLabel("Пароль").fill("password123");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("dialog", { name: "Welcome to Xenia Way" })).toHaveCount(0);

  await page.evaluate(() => {
    window.localStorage.setItem(
      "userPreferences",
      JSON.stringify({ theme: "dark", language: "uk", wasIntroduced: false }),
    );
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("has no automated accessibility violations across key workflows", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "A clear workspace for a complicated job search." })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByRole("button", { name: /Filter statuses/ }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Add job" }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("provides a keyboard skip link to the main content", async ({ page }) => {
  await page.goto("/about");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("manages focus and escape behavior for the job form dialog", async ({ page }) => {
  let releaseHost: () => void = () => undefined;
  const hostRelease = new Promise<void>((resolve) => {
    releaseHost = resolve;
  });
  await page.route("**/form/job-manager-host.tsx*", async (route) => {
    await hostRelease;
    await route.continue();
  });
  const formHostRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/form/job-manager-host.tsx")) {
      formHostRequests.push(request.url());
    }
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("test_user@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();

  const addJob = page.getByRole("button", { name: "Add job" });
  expect(formHostRequests).toHaveLength(0);
  await addJob.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("Loading…");
  await page.keyboard.press("Tab");
  await expect(addJob).not.toBeFocused();
  releaseHost();
  const closeButton = page.getByRole("button", { name: "Close", exact: true });
  await expect(closeButton).toBeFocused();
  expect(formHostRequests).toHaveLength(1);
  await expect(page.getByRole("button", { name: "Close dialog", exact: true })).toBeVisible();

  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(closeButton).toHaveCount(0);
  await expect(addJob).toBeFocused();

  await addJob.click();
  await expect(closeButton).toBeFocused();
  expect(formHostRequests).toHaveLength(1);
  const switchToModal = page.getByRole("button", { name: "Switch to modal" });
  const presentationUpdate = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/user/preferences") &&
      response.request().method() === "PATCH" &&
      response.status() === 200,
  );
  await switchToModal.click();
  await presentationUpdate;
  await expect(page.locator(".job-modal")).toBeVisible();
  await expect(page.getByRole("button", { name: "Switch to drawer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close dialog", exact: true })).toBeVisible();
  await expect(
    page.evaluate(() => JSON.parse(localStorage.getItem("userPreferences") ?? "{}").formPresentation),
  ).resolves.toBe("modal");
});

test("shows only the statuses selected in the filter menu", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();

  await page.getByRole("button", { name: /Filter statuses/ }).click();
  const menu = page.locator("#status-filter-options");
  await expect(menu).toBeVisible();
  await menu.locator("label").filter({ hasText: "Offer" }).locator("input").uncheck();
  await expect(page.getByRole("region", { name: "Offer applications" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Saved applications" })).toBeVisible();

  await menu.locator("input").first().check();
  await expect(page.getByRole("region", { name: "Offer applications" })).toBeVisible();
  await menu.locator("input").first().uncheck();
  await expect(page.getByRole("region", { name: "Saved applications" })).toHaveCount(0);
  await menu.locator("input").first().check();
  await expect(page.getByRole("region", { name: "Saved applications" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /Filter statuses/ })).toBeFocused();
});

test("persists drag-and-drop ordering within a status", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("test_user@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  const welcome = page.getByRole("dialog", { name: "Welcome to Xenia Way" });
  if (await welcome.isVisible())
    await welcome.getByRole("button", { name: "Close welcome introduction" }).last().click();

  const savedColumn = page.getByRole("region", { name: "Saved applications" });
  const cards = savedColumn.locator("ul > li > button");
  const cardTargets = savedColumn.locator("ul > li");
  await expect(cards.nth(1)).toBeVisible();
  expect(await cards.count()).toBeGreaterThanOrEqual(2);
  const secondCompany = await cards.nth(1).locator("p").first().textContent();
  if (!secondCompany) throw new Error("Unable to locate the second saved application");

  await cards.nth(1).dragTo(cardTargets.nth(0));
  await expect(savedColumn.locator("ul > li > button").first()).toContainText(secondCompany);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Saved applications" }).locator("ul > li > button").first(),
  ).toContainText(secondCompany);
});

test("supports keyboard reordering within a status", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("test_user@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();

  const savedColumn = page.getByRole("region", { name: "Saved applications" });
  const cards = savedColumn.locator('button[draggable="true"]');
  await expect(cards.nth(1)).toBeVisible();
  const secondCompany = await cards.nth(1).locator("p").first().textContent();
  if (!secondCompany) throw new Error("Unable to locate the second saved application");

  await cards.nth(1).focus();
  await page.keyboard.press("ArrowUp");
  await expect(cards.first()).toContainText(secondCompany);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Saved applications" }).locator('button[draggable="true"]').first(),
  ).toContainText(secondCompany);
});

test("focuses and announces application form validation errors", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("test_user@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();

  await page.getByRole("button", { name: "Add job" }).click();
  await page.getByLabel("Company *").fill(" ");
  await page.getByLabel("Position *").fill("Engineer");
  await page.getByRole("button", { name: "Save application" }).click();

  const error = page.getByRole("alert");
  await expect(error).toBeVisible();
  await expect(error).toBeFocused();
});

test("uses floating labels for search and application fields", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("test_user@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();

  await expect(page.locator(".floating-label > input")).toHaveCount(1);
  await expect(page.locator(".floating-label-with-icon > svg")).toHaveCount(1);
  await expect(page.getByLabel("Search applications")).toHaveAttribute("placeholder", " ");

  await page.getByRole("button", { name: "Add job" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".floating-label > input")).toHaveCount(6);
  await expect(dialog.locator(".floating-label > textarea")).toHaveCount(2);
  await expect(dialog.locator(".floating-label > select")).toHaveCount(1);
  await expect(dialog.locator(".floating-label-with-icon > svg")).toHaveCount(9);
  for (const label of [
    "Company *",
    "Position *",
    "Location",
    "Salary",
    "Job URL",
    "Status",
    "Applied date",
    "Description",
    "Notes",
  ]) {
    await expect(dialog.getByLabel(label)).toBeVisible();
  }
});

test("switches and persists the job form presentation mode", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();

  await page.getByRole("button", { name: "Add job" }).click();
  await expect(page.getByRole("button", { name: "Switch to modal" })).toBeVisible();
  await page.getByRole("button", { name: "Switch to modal" }).click();
  await expect(page.locator(".job-modal")).toBeVisible();
  await expect(page.getByRole("button", { name: "Switch to drawer" })).toBeVisible();

  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Add job" }).click();
  await expect(page.locator(".job-modal")).toBeVisible();
});

test("logs out and returns to login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  const themeUpdate = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/user/preferences") &&
      response.request().method() === "PATCH" &&
      response.status() === 200,
  );
  await page.getByRole("button", { name: "Theme: System. Change theme" }).click();
  await themeUpdate;
  await expect.poll(() => page.locator("html").getAttribute("data-theme")).toBe("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const preferences = await page.evaluate(() => localStorage.getItem("userPreferences"));
  expect(preferences).not.toBeNull();
  await page.getByRole("button", { name: "Logout" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByText("Loading applications…")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("userPreferences"))).toBe(preferences);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("userPreferences"))).toBe(preferences);
});

test("permanently deletes a blacklisted application", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  const welcome = page.getByRole("dialog", { name: "Welcome to Xenia Way" });
  if (await welcome.isVisible()) await welcome.getByRole("button", { name: "Go to board" }).click();

  const company = `Blacklisted deletion ${Date.now()}`;
  await page.getByRole("button", { name: "Add job" }).click();
  await page.getByLabel("Company *").fill(company);
  await page.getByLabel("Position *").fill("Engineer");
  await page.getByRole("button", { name: "Save application" }).click();
  await page.getByRole("button", { name: new RegExp(company) }).click();
  await page.getByRole("button", { name: "Add to blacklist" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Add to blacklist" }).click();
  await page.getByRole("link", { name: "Blacklist", exact: true }).click();
  await expect(page.getByRole("heading", { name: company })).toBeVisible();

  await page
    .getByRole("heading", { name: company })
    .locator("xpath=../..")
    .getByRole("button", { name: "Delete" })
    .click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Yes" }).click();
  await expect(page.getByText(company, { exact: true })).toHaveCount(0);
});

test("logs in, filters the board, moves, archives, and deletes an application", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  const welcome = page.getByRole("dialog", { name: "Welcome to Xenia Way" });
  if (await welcome.isVisible())
    await welcome.getByRole("button", { name: "Close welcome introduction" }).last().click();
  for (const status of ["Saved", "Applied", "Interview", "Offer", "Rejected", "Withdrawn"]) {
    await expect(page.getByRole("heading", { name: status })).toBeVisible();
  }

  const company = `E2E Company ${Date.now()}`;
  await page.getByRole("button", { name: "Add job" }).click();
  await page.getByLabel("Company *").fill(company);
  await page.getByLabel("Position *").fill("E2E Engineer");
  await page.getByRole("button", { name: "Save application" }).click();
  await expect(page.getByRole("button", { name: new RegExp(company) })).toBeVisible();

  await page.getByRole("button", { name: new RegExp(company) }).click();
  await expect(page).toHaveURL(/\/applications\/\d+$/);
  await expect(page.getByRole("heading", { name: company })).toBeFocused();
  await page.getByRole("heading", { name: "Interview preparation" }).waitFor();
  await page.getByRole("button", { name: "Company research, Edit" }).click();
  await page.getByRole("textbox", { name: "Company research" }).fill("Recent product launches and team structure");
  await page.getByRole("button", { name: "Save company research" }).click();
  await expect(page.getByText("Recent product launches and team structure")).toBeVisible();

  await page.getByRole("button", { name: "Add contact" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Jordan Recruiter");
  await page.getByLabel("Role", { exact: true }).fill("Talent Partner");
  await page.getByLabel("Email", { exact: true }).fill("jordan@example.com");
  await page.getByRole("button", { name: "Save contact" }).click();
  await expect(page.getByText("Jordan Recruiter", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit Jordan Recruiter" }).click();
  await page.getByLabel("Role", { exact: true }).fill("Senior Talent Partner");
  await page.getByRole("button", { name: "Save contact" }).click();
  await expect(page.getByText("Senior Talent Partner", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Add follow-up" }).click();
  await page.getByLabel("Task", { exact: true }).fill("Send interview thank-you");
  await page.getByLabel("Due date").fill("2030-01-15");
  await page.getByRole("button", { name: "Save follow-up" }).click();
  await expect(page.getByText("Send interview thank-you", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit Send interview thank-you" }).click();
  await page.getByLabel("Task", { exact: true }).fill("Send recruiter thank-you");
  await page.getByRole("button", { name: "Save follow-up" }).click();
  await page.getByRole("button", { name: "Complete Send recruiter thank-you" }).click();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Recent product launches and team structure")).toBeVisible();
  await expect(page.getByText("Jordan Recruiter", { exact: true })).toBeVisible();
  await expect(page.getByText("Senior Talent Partner", { exact: true })).toBeVisible();
  await expect(page.getByText("Send recruiter thank-you", { exact: true })).toBeVisible();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove Jordan Recruiter" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Yes" }).click();
  await expect(page.getByText("Jordan Recruiter", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Delete Send recruiter thank-you" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Yes" }).click();
  await expect(page.getByText("Send recruiter thank-you", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Add to blacklist" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Add to blacklist" }).click();
  await page.getByRole("link", { name: "Blacklist", exact: true }).click();
  await expect(page).toHaveURL(/\/blacklist$/);
  const blacklistedCard = page.getByRole("heading", { name: company }).locator("xpath=../..");
  await expect(blacklistedCard).toBeVisible();
  await blacklistedCard.getByRole("link", { name: "Open workspace" }).click();
  await expect(page).toHaveURL(/\/applications\/\d+$/);
  await expect(page.getByRole("heading", { name: company })).toBeVisible();
  await page.getByRole("link", { name: "Back to Blacklist" }).click();
  await blacklistedCard.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByText(company, { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Applications" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: new RegExp(company) })).toBeVisible();

  await page.getByLabel("Search applications").fill(company);
  await expect(page.getByRole("button", { name: new RegExp(company) })).toHaveCount(1);
  await page.getByLabel("Search applications").fill("");

  const applicationCard = page.getByRole("button", { name: new RegExp(company) });
  const appliedColumn = page.getByRole("heading", { name: "Applied" }).locator("xpath=../..");
  const sourceHandle = await applicationCard.elementHandle();
  const targetHandle = await appliedColumn.elementHandle();
  if (!sourceHandle || !targetHandle) throw new Error("Unable to locate drag source or target");
  await page.evaluate(
    ([source, target]) => {
      const dataTransfer = new DataTransfer();
      source.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer }));
      target.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer }));
      target.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer }));
    },
    [sourceHandle, targetHandle],
  );
  await expect(
    page.getByRole("region", { name: "Applied applications" }).getByRole("button", { name: new RegExp(company) }),
  ).toBeVisible();

  await applicationCard.click();
  await expect(page).toHaveURL(/\/applications\/\d+$/);
  await page.getByRole("button", { name: "Archive application" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Archive application" }).click();
  await page.getByRole("link", { name: "Archive", exact: true }).click();
  await expect(page).toHaveURL(/\/archive$/);
  await expect(page.getByText(company, { exact: true })).toBeVisible();
  const archivedCard = page.getByRole("heading", { name: company }).locator("xpath=../..");
  await archivedCard.getByRole("link", { name: "Open workspace" }).click();
  await expect(page).toHaveURL(/\/applications\/\d+$/);
  await expect(page.getByRole("heading", { name: company })).toBeVisible();
  await page.getByRole("link", { name: "Back to Archive" }).click();

  await archivedCard.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Yes" }).click();
  await expect(page.getByText(company, { exact: true })).toHaveCount(0);
});
