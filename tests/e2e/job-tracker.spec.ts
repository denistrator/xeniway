import { expect, test } from "@playwright/test";

test("shows the about page without authentication", async ({ page }) => {
  await page.goto("/about");

  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: "Keep your job search moving" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  await expect(page.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register");
});

test("shows only the statuses selected in the filter menu", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();

  await page.getByRole("button", { name: /Filter statuses/ }).click();
  const menu = page.getByRole("menu", { name: "Filter statuses" });
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

test("switches and persists the job form presentation mode", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("test_user@example.com");
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
  await page.getByLabel("Theme").selectOption("dark");
  await expect.poll(() => page.locator("html").getAttribute("data-theme")).toBe("dark");
  await expect(page.locator("header")).toHaveClass(/dark:bg-slate-900/);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("header")).toHaveClass(/dark:bg-slate-900/);
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
  await expect(applicationCard.getByText("Applied", { exact: true })).toBeVisible();

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
