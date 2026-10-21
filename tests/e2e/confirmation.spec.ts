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
  await page.getByRole("menuitem", { name: "Hebrew", exact: true }).click();
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
