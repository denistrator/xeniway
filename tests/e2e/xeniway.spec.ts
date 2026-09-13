import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
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

test("switches and persists the selected browser language", async ({ page }) => {
  await page.goto("/about");
  await page.getByRole("button", { name: "Language: English. Change language" }).click();
  await page.getByRole("button", { name: "Language: Русский. Change language" }).click();
  await page.getByRole("button", { name: "Language: Українська. Change language" }).click();
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

test("shows the welcome popup after login and registration", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();

  const welcome = page.getByRole("dialog");
  await expect(welcome).toBeVisible();
  await expect(welcome).toHaveAccessibleName("Welcome to Xenia Way");
  await expect(welcome.getByText("Xenia Way gives you one clear place")).toBeVisible();
  await welcome.getByRole("button", { name: "Language: English. Change language" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(welcome).toHaveAccessibleName("Добро пожаловать в Xenia Way");
  await expect(welcome.getByRole("heading", { name: "Добро пожаловать в Xenia Way" })).toBeVisible();
  await welcome.getByRole("button", { name: "Language: Русский. Change language" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await welcome.getByRole("button", { name: "Language: Українська. Change language" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(welcome).toHaveAccessibleName("ברוכים הבאים ל־Xenia Way");
  await welcome.getByRole("button", { name: "Language: עברית. Change language" }).click();
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
  await expect(page.getByRole("button", { name: "Close dialog", exact: true })).toBeVisible();

  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(closeButton).toHaveCount(0);
  await expect(addJob).toBeFocused();

  await addJob.click();
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
  await page.getByRole("button", { name: "+ Add job" }).click();
  await page.getByLabel("Company *").fill(company);
  await page.getByLabel("Position *").fill("Engineer");
  await page.getByRole("button", { name: "Save application" }).click();
  await page.getByRole("button", { name: new RegExp(company) }).click();
  await page.getByRole("button", { name: "Blacklist", exact: true }).click();
  await page.getByRole("button", { name: "Confirm blacklist" }).click();
  await page.getByRole("link", { name: "Blacklist" }).click();
  await expect(page.getByRole("heading", { name: company })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("heading", { name: company })
    .locator("xpath=../..")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText(company, { exact: true })).toHaveCount(0);
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
  await page.getByRole("button", { name: "Blacklist", exact: true }).click();
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
