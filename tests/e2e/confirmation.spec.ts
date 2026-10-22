import { expect, test } from "@playwright/test";
import type { ApplicationResponse, AuthResponse, CsrfResponse } from "@xeniway/shared";

test("contains confirmation focus and restores it without deleting applications", async ({ page }) => {
  const bootstrap = await page.request.get("/api/auth/csrf");
  const registration = await page.request.post("/api/auth/register", {
    headers: { "x-csrf-token": ((await bootstrap.json()) as CsrfResponse).data.csrfToken },
    data: { email: `confirmation-${crypto.randomUUID()}@example.com`, password: "password123" },
  });
  expect(registration.ok()).toBe(true);
  const headers = { "x-csrf-token": ((await registration.json()) as AuthResponse).data.csrfToken };
  expect((await page.request.post("/api/user/preferences/introduced", { headers })).ok()).toBe(true);
  expect(
    (
      await page.request.post("/api/applications", {
        headers,
        data: { company: "Confirmation focus", position: "Engineer", status: "saved" },
      })
    ).ok(),
  ).toBe(true);

  const deletionRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/applications/remove-all") {
      deletionRequests.push(request.method());
    }
  });
  await page.goto("/");
  const opener = page.getByRole("button", { name: "Remove all", exact: true });
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("alertdialog");
  const cancel = dialog.getByRole("button", { name: "No", exact: true });
  const confirm = dialog.getByRole("button", { name: "Yes", exact: true });
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(confirm).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(cancel).toBeFocused();
  await page.locator("#main-content").focus();
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();

  await opener.click();
  await confirm.click();
  const countdownConfirm = dialog.getByRole("button", { name: /^Yes \(/ });
  await expect(countdownConfirm).toBeDisabled();
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(cancel).toBeFocused();
  await cancel.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("#main-content")).toBeFocused();
  expect(deletionRequests).toEqual([]);
  await expect(page.getByRole("link", { name: /^Confirmation focus, Engineer,/ })).toBeVisible();
});

test("preserves compact drafts on dismissal and requires explicit discard in English and Hebrew", async ({ page }) => {
  const bootstrap = await page.request.get("/api/auth/csrf");
  const registration = await page.request.post("/api/auth/register", {
    headers: { "x-csrf-token": ((await bootstrap.json()) as CsrfResponse).data.csrfToken },
    data: { email: `dirty-warning-${crypto.randomUUID()}@example.com`, password: "password123" },
  });
  expect(registration.ok()).toBe(true);
  const headers = { "x-csrf-token": ((await registration.json()) as AuthResponse).data.csrfToken };
  expect((await page.request.post("/api/user/preferences/introduced", { headers })).ok()).toBe(true);
  const application = await page.request.post("/api/applications", {
    headers,
    data: { company: "Unsaved draft checks", position: "Engineer", status: "saved" },
  });
  expect(application.ok()).toBe(true);
  const id = ((await application.json()) as ApplicationResponse).data.application.id;
  const detailUrl = `/api/applications/${id}`;
  const updates: unknown[] = [];
  page.on("request", (request) => {
    if (request.method() === "PUT" && new URL(request.url()).pathname === detailUrl) {
      updates.push(request.postDataJSON());
    }
  });
  await page.goto(`/applications/${id}`);
  const company = page.getByRole("textbox", { name: /^Company/ });
  const location = page.getByRole("textbox", { name: "Location", exact: true });
  const editCompany = page.getByRole("button", { name: "Company, Edit", exact: true });
  const dialog = page.getByRole("alertdialog");
  const keepEditing = dialog.getByRole("button", { name: "Keep editing", exact: true });
  await page.getByRole("button", { name: "Location, Edit", exact: true }).click();
  await location.fill("  Remote draft  ");
  await editCompany.click();
  await expect(keepEditing).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Save changes", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(keepEditing).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(location).toHaveValue("  Remote draft  ");
  await expect(location).toBeFocused();
  await expect(company).toHaveCount(0);
  expect(updates).toEqual([]);

  await editCompany.click();
  await page
    .getByRole("button", { name: "Keep editing", exact: true })
    .first()
    .click({ position: { x: 5, y: 5 } });
  await expect(location).toBeFocused();
  await expect(location).toHaveValue("  Remote draft  ");
  expect(updates).toEqual([]);
  await editCompany.click();
  await keepEditing.click();
  await expect(location).toBeFocused();
  await expect(location).toHaveValue("  Remote draft  ");

  await editCompany.click();
  await dialog.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(company).toBeFocused();
  expect(updates).toEqual([]);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Location, Edit", exact: true }).click();
  await expect(location).toHaveValue("");
  await location.fill("Saved location");
  await editCompany.click();
  const saved = page.waitForResponse(
    (response) => new URL(response.url()).pathname === detailUrl && response.request().method() === "PUT",
  );
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await saved).ok()).toBe(true);
  await expect(company).toBeFocused();
  expect(updates).toEqual([{ location: "Saved location" }]);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Language: English. Change language", exact: true }).click();
  const languageSaved = page.waitForResponse(
    (response) => response.url().endsWith("/api/user/preferences") && response.request().method() === "PATCH",
  );
  await page.getByRole("menuitemradio", { name: "Hebrew", exact: true }).click();
  expect((await languageSaved).ok()).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("button", { name: "מיקום, עריכה", exact: true }).click();
  const hebrewLocation = page.getByRole("textbox", { name: "מיקום", exact: true });
  await expect(hebrewLocation).toHaveValue("Saved location");
  await hebrewLocation.fill("טיוטה");
  await page.getByRole("button", { name: "חברה, עריכה", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "המשך עריכה", exact: true })).toBeFocused();
  await expect(dialog.getByRole("button", { name: "ביטול השינויים", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "שמירת השינויים", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(hebrewLocation).toBeFocused();
  await expect(hebrewLocation).toHaveValue("טיוטה");
  expect(updates).toEqual([{ location: "Saved location" }]);
});

test("blocks dirty workspace departure until the draft is explicitly discarded", async ({ page }) => {
  const bootstrap = await page.request.get("/api/auth/csrf");
  const registration = await page.request.post("/api/auth/register", {
    headers: { "x-csrf-token": ((await bootstrap.json()) as CsrfResponse).data.csrfToken },
    data: { email: `departure-${crypto.randomUUID()}@example.com`, password: "password123" },
  });
  expect(registration.ok()).toBe(true);
  const headers = { "x-csrf-token": ((await registration.json()) as AuthResponse).data.csrfToken };
  expect((await page.request.post("/api/user/preferences/introduced", { headers })).ok()).toBe(true);
  const created = await page.request.post("/api/applications", {
    headers,
    data: { company: "Departure guard", position: "Engineer", status: "saved" },
  });
  expect(created.ok()).toBe(true);
  const applicationId = ((await created.json()) as ApplicationResponse).data.application.id;

  await page.goto("/");
  await page.getByRole("link", { name: /^Departure guard, Engineer,/ }).click();
  await page.getByRole("button", { name: "Add activity", exact: true }).click();
  const title = page.getByRole("textbox", { name: "Title", exact: true });
  await title.fill("Prepare questions");
  await page.goBack();

  const dialog = page.getByRole("alertdialog", { description: "Save your changes, discard them, or keep editing." });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/applications/${applicationId}$`));
  await expect(title).toHaveValue("Prepare questions");

  await page.goBack();
  await dialog.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
});

test("blocks dirty create-form browser Forward navigation until the draft is discarded", async ({ page }) => {
  const bootstrap = await page.request.get("/api/auth/csrf");
  const registration = await page.request.post("/api/auth/register", {
    headers: { "x-csrf-token": ((await bootstrap.json()) as CsrfResponse).data.csrfToken },
    data: { email: `forward-departure-${crypto.randomUUID()}@example.com`, password: "password123" },
  });
  expect(registration.ok()).toBe(true);
  const headers = { "x-csrf-token": ((await registration.json()) as AuthResponse).data.csrfToken };
  expect((await page.request.post("/api/user/preferences/introduced", { headers })).ok()).toBe(true);
  const created = await page.request.post("/api/applications", {
    headers,
    data: { company: "Forward departure", position: "Engineer", status: "saved" },
  });
  expect(created.ok()).toBe(true);
  const applicationId = ((await created.json()) as ApplicationResponse).data.application.id;

  await page.goto("/");
  await page.getByRole("link", { name: /^Forward departure, Engineer,/ }).click();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();

  await page.getByRole("button", { name: "Add job", exact: true }).click();
  const company = page.getByRole("textbox", { name: "Company *", exact: true });
  await company.fill("Forward draft");
  await page.goForward();

  const dialog = page.getByRole("alertdialog", { description: "Save your changes, discard them, or keep editing." });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(company).toHaveValue("Forward draft");

  await page.goForward();
  await dialog.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/applications/${applicationId}$`));
});

test("uses the departure dialog instead of stacking a compact-field warning on browser Back", async ({ page }) => {
  const bootstrap = await page.request.get("/api/auth/csrf");
  const registration = await page.request.post("/api/auth/register", {
    headers: { "x-csrf-token": ((await bootstrap.json()) as CsrfResponse).data.csrfToken },
    data: { email: `compact-departure-${crypto.randomUUID()}@example.com`, password: "password123" },
  });
  expect(registration.ok()).toBe(true);
  const headers = { "x-csrf-token": ((await registration.json()) as AuthResponse).data.csrfToken };
  expect((await page.request.post("/api/user/preferences/introduced", { headers })).ok()).toBe(true);
  const created = await page.request.post("/api/applications", {
    headers,
    data: { company: "Compact departure", position: "Engineer", status: "saved" },
  });
  expect(created.ok()).toBe(true);

  await page.goto("/");
  await page.getByRole("link", { name: /^Compact departure, Engineer,/ }).click();
  await page.getByRole("button", { name: "Location, Edit", exact: true }).click();
  const location = page.getByRole("textbox", { name: "Location", exact: true });
  await location.fill("Remote");
  await page.goBack();

  const departureDialog = page.getByRole("alertdialog", {
    description: "Save your changes, discard them, or keep editing.",
  });
  await expect(departureDialog).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveCount(1);
  await departureDialog.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(location).toHaveValue("Remote");

  await page.goBack();
  await departureDialog.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("saves a compact draft before completing browser Back navigation", async ({ page }) => {
  const bootstrap = await page.request.get("/api/auth/csrf");
  const registration = await page.request.post("/api/auth/register", {
    headers: { "x-csrf-token": ((await bootstrap.json()) as CsrfResponse).data.csrfToken },
    data: { email: `save-departure-${crypto.randomUUID()}@example.com`, password: "password123" },
  });
  expect(registration.ok()).toBe(true);
  const headers = { "x-csrf-token": ((await registration.json()) as AuthResponse).data.csrfToken };
  expect((await page.request.post("/api/user/preferences/introduced", { headers })).ok()).toBe(true);
  const created = await page.request.post("/api/applications", {
    headers,
    data: { company: "Save departure", position: "Engineer", status: "saved" },
  });
  expect(created.ok()).toBe(true);
  const applicationId = ((await created.json()) as ApplicationResponse).data.application.id;

  await page.goto("/");
  await page.getByRole("link", { name: /^Save departure, Engineer,/ }).click();
  await page.getByRole("button", { name: "Location, Edit", exact: true }).click();
  await page.getByRole("textbox", { name: "Location", exact: true }).fill("Remote");
  const updated = page.waitForResponse(
    (response) => new URL(response.url()).pathname === `/api/applications/${applicationId}`,
  );
  await page.goBack();

  const dialog = page.getByRole("alertdialog", { description: "Save your changes, discard them, or keep editing." });
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await updated).ok()).toBe(true);
  await expect(page).toHaveURL(/\/$/);
});

test("keeps a failed compact save in the departure dialog", async ({ page }) => {
  const bootstrap = await page.request.get("/api/auth/csrf");
  const registration = await page.request.post("/api/auth/register", {
    headers: { "x-csrf-token": ((await bootstrap.json()) as CsrfResponse).data.csrfToken },
    data: { email: `failed-departure-${crypto.randomUUID()}@example.com`, password: "password123" },
  });
  expect(registration.ok()).toBe(true);
  const headers = { "x-csrf-token": ((await registration.json()) as AuthResponse).data.csrfToken };
  expect((await page.request.post("/api/user/preferences/introduced", { headers })).ok()).toBe(true);
  const created = await page.request.post("/api/applications", {
    headers,
    data: { company: "Failed departure", position: "Engineer", status: "saved" },
  });
  expect(created.ok()).toBe(true);
  const applicationId = ((await created.json()) as ApplicationResponse).data.application.id;

  await page.goto("/");
  await page.getByRole("link", { name: /^Failed departure, Engineer,/ }).click();
  await page.getByRole("button", { name: "Location, Edit", exact: true }).click();
  const location = page.getByRole("textbox", { name: "Location", exact: true });
  await location.fill("Remote");
  await page.route(`**/api/applications/${applicationId}`, async (route) => {
    if (route.request().method() === "PUT") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: '{"error":{"code":"REQUEST_FAILED"}}',
      });
      return;
    }

    await route.continue();
  });
  await page.goBack();

  const dialog = page.getByRole("alertdialog", { description: "Save your changes, discard them, or keep editing." });
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Something went wrong. Please try again.");
  await expect(page).toHaveURL(new RegExp(`/applications/${applicationId}$`));
  await expect(location).toHaveValue("Remote");
});

test("does not block logout when a workspace editor is dirty", async ({ page }) => {
  const bootstrap = await page.request.get("/api/auth/csrf");
  const registration = await page.request.post("/api/auth/register", {
    headers: { "x-csrf-token": ((await bootstrap.json()) as CsrfResponse).data.csrfToken },
    data: { email: `logout-departure-${crypto.randomUUID()}@example.com`, password: "password123" },
  });
  expect(registration.ok()).toBe(true);
  const headers = { "x-csrf-token": ((await registration.json()) as AuthResponse).data.csrfToken };
  expect((await page.request.post("/api/user/preferences/introduced", { headers })).ok()).toBe(true);
  const created = await page.request.post("/api/applications", {
    headers,
    data: { company: "Logout departure", position: "Engineer", status: "saved" },
  });
  expect(created.ok()).toBe(true);
  const applicationId = ((await created.json()) as ApplicationResponse).data.application.id;

  await page.goto(`/applications/${applicationId}`);
  await page.getByRole("button", { name: "Add activity", exact: true }).click();
  await page.getByRole("textbox", { name: "Title", exact: true }).fill("Draft before logout");
  await page.getByRole("button", { name: "Logout", exact: true }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
});
