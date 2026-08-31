import { expect, test } from "@playwright/test";

test("demonstrates the job-tracker stack", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Job Tracker" })).toBeVisible();
  await expect(page.getByText("Hello from Bun + Elysia!")).toBeVisible();
  await page.getByRole("button", { name: "Increase" }).click();
  await expect(page.getByText("1", { exact: true })).toBeVisible();
  const message = `Playwright says hello ${Date.now()}`;
  await page.getByLabel("Message").fill(message);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(message, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: "About this demo" })).toBeVisible();
});
