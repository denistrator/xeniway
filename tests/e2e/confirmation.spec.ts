import { expect, test } from "@playwright/test";
import type { AuthResponse, CsrfResponse } from "@xeniway/shared";

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
