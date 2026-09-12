import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

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

test("switches and persists the selected browser language", async ({ page }) => {
  await page.goto("/about");
  await page.getByRole("button", { name: "Українська" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(page.getByRole("heading", { name: "Зрозумілий простір для складного пошуку роботи." })).toBeVisible();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(page.getByRole("button", { name: "Українська", pressed: true })).toBeVisible();
});

test("shows a public not found page for unknown routes", async ({ page }) => {
  await page.goto("/does-not-exist");

  await expect(page).toHaveURL(/\/does-not-exist$/);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to applications" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("link", { name: "About Xenia Way" })).toHaveAttribute("href", "/about");
  await expect(page.getByRole("group", { name: "Theme preference" })).toBeVisible();
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

  await page.getByRole("button", { name: "+ Add job" }).click();
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
  await page.goto("/login");
  await page.getByLabel("Email").fill("test_user@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();

  const addJob = page.getByRole("button", { name: "+ Add job" });
  await addJob.click();
  const closeButton = page.getByRole("button", { name: "Close", exact: true });
  await expect(closeButton).toBeFocused();

  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(closeButton).toHaveCount(0);
  await expect(addJob).toBeFocused();
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

  const savedColumn = page.getByRole("region", { name: "Saved applications" });
  const cards = savedColumn.locator('button[draggable="true"]');
  await expect(cards.nth(1)).toBeVisible();
  expect(await cards.count()).toBeGreaterThanOrEqual(2);
  const secondCompany = await cards.nth(1).locator("p").first().textContent();
  if (!secondCompany) throw new Error("Unable to locate the second saved application");

  await cards.nth(1).dragTo(cards.nth(0));
  await expect(savedColumn.locator('button[draggable="true"]').first()).toContainText(secondCompany);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Saved applications" }).locator('button[draggable="true"]').first(),
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

  await page.getByRole("button", { name: "+ Add job" }).click();
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

  await page.getByRole("button", { name: "+ Add job" }).click();
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

  await page.getByRole("button", { name: "+ Add job" }).click();
  await expect(page.getByRole("button", { name: "Switch to modal" })).toBeVisible();
  await page.getByRole("button", { name: "Switch to modal" }).click();
  await expect(page.locator(".job-modal")).toBeVisible();
  await expect(page.getByRole("button", { name: "Switch to drawer" })).toBeVisible();

  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "+ Add job" }).click();
  await expect(page.locator(".job-modal")).toBeVisible();
});

test("logs out and returns to login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  await page.getByRole("button", { name: "Use Dark theme" }).click();
  await expect.poll(() => page.locator("html").getAttribute("data-theme")).toBe("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Logout" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByText("Loading applications…")).toHaveCount(0);
});

test("logs in, filters the board, moves, archives, and deletes an application", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  for (const status of ["Saved", "Applied", "Interview", "Offer", "Rejected", "Withdrawn"]) {
    await expect(page.getByRole("heading", { name: status })).toBeVisible();
  }

  const company = `E2E Company ${Date.now()}`;
  await page.getByRole("button", { name: "+ Add job" }).click();
  await page.getByLabel("Company *").fill(company);
  await page.getByLabel("Position *").fill("E2E Engineer");
  await page.getByRole("button", { name: "Save application" }).click();
  await expect(page.getByRole("button", { name: new RegExp(company) })).toBeVisible();

  await page.getByRole("button", { name: new RegExp(company) }).click();
  await page.getByRole("button", { name: "Blacklist" }).click();
  await expect(page.getByLabel("Reason")).toBeVisible();
  await page.getByLabel("Reason").fill("Duplicate employer");
  await page.getByRole("button", { name: "Confirm blacklist" }).click();
  await page.getByRole("link", { name: "Blacklist" }).click();
  await expect(page).toHaveURL(/\/blacklist$/);
  await expect(page.getByText(company, { exact: true })).toBeVisible();
  await expect(page.getByText("Duplicate employer", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove from blacklist" }).click();
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
  await page.getByRole("button", { name: "Archive application" }).click();
  await page.getByRole("link", { name: "Archive" }).click();
  await expect(page).toHaveURL(/\/archive$/);
  await expect(page.getByText(company, { exact: true })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("heading", { name: company })
    .locator("xpath=../..")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText(company, { exact: true })).toHaveCount(0);
});
