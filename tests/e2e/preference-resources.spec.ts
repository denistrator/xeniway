import { expect, test } from "@playwright/test";

const hebrewDictionary = /\/(?:assets\/he-[^/?]+|locales\/he)\.json(?:\?|$)/;

test.beforeEach(async ({ page }) => {
  // These public-page resource scenarios do not exercise account authentication.
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: { data: { user: null } } }));
  await page.route("**/api/auth/csrf", (route) =>
    route.fulfill({ json: { data: { csrfToken: "public-resource-test" } } }),
  );
});

test("retries a failed lazy language download without navigation or an account write", async ({ page }) => {
  let blocked = true;
  let downloads = 0;
  let accountWrites = 0;
  page.on("request", (request) => {
    const isPreferenceWrite = request.method() === "PATCH" && request.url().endsWith("/api/user/preferences");
    if (isPreferenceWrite) {
      accountWrites += 1;
    }
  });
  await page.route(hebrewDictionary, (route) => {
    if (route.request().resourceType() !== "fetch") {
      return route.continue();
    }
    downloads += 1;
    return blocked ? route.abort("failed") : route.continue();
  });

  await page.goto("/about");
  const originalUrl = page.url();
  expect(downloads).toBe(0);
  await page.getByRole("button", { name: "Language: English. Change language" }).click();
  await page.getByRole("menuitemradio", { name: "Hebrew" }).click();
  const retry = page.getByRole("button", { name: "Retry language download" });
  await expect(retry).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  expect(downloads).toBe(1);
  expect(accountWrites).toBe(0);

  blocked = false;
  await retry.click();
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(downloads).toBe(2);
  expect(page.url()).toBe(originalUrl);
  expect(accountWrites).toBe(0);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("renders truthful startup fallback and explicitly recovers the retained preferred language", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("userPreferences", JSON.stringify({ language: "he", theme: "system" }));
  });
  let blocked = true;
  let downloads = 0;
  await page.route(hebrewDictionary, (route) => {
    if (route.request().resourceType() !== "fetch") {
      return route.continue();
    }
    downloads += 1;
    return blocked ? route.abort("failed") : route.continue();
  });

  await page.goto("/about");
  const retry = page.getByRole("button", { name: "Retry language download" });
  await expect(retry).toBeVisible();
  await expect(page.getByRole("button", { name: "Language: English. Change language" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("userPreferences") ?? "{}").language)).toBe("he");
  expect(downloads).toBe(1);

  blocked = false;
  await retry.click();
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(downloads).toBe(2);
});
