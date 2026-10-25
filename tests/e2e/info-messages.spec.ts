import { expect, test } from "@playwright/test";
import type { AuthResponse, CsrfResponse } from "@xeniway/shared";

test("informational feedback pauses for interaction, expires, and accepts a later result", async ({ page }) => {
  const bootstrap = await page.request.get("/api/auth/csrf");
  const registration = await page.request.post("/api/auth/register", {
    headers: { "x-csrf-token": ((await bootstrap.json()) as CsrfResponse).data.csrfToken },
    data: { email: `info-message-${crypto.randomUUID()}@example.com`, password: "password123" },
  });
  expect(registration.ok()).toBe(true);
  expect(
    (
      await page.request.post("/api/user/preferences/introduced", {
        headers: { "x-csrf-token": ((await registration.json()) as AuthResponse).data.csrfToken },
      })
    ).ok(),
  ).toBe(true);

  await page.goto("/about");
  await expect(page.getByRole("button", { name: "Theme: System. Change theme" })).toBeVisible();
  await page.clock.install({ time: new Date("2026-10-24T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-24T12:00:01Z"));
  const info = page.getByRole("status").filter({ hasText: "Saved to your account." });
  const saved = page.waitForResponse(
    (response) => response.url().endsWith("/api/user/preferences") && response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Theme: System. Change theme" }).click();
  expect((await saved).ok()).toBe(true);
  await page.clock.runFor(1);
  await expect(info).toBeVisible();
  await expect(info.getByRole("progressbar")).toHaveCount(0);
  await expect(info).not.toContainText(/closes in|10s/i);

  await info.getByRole("button", { name: "Dismiss preference notice" }).focus();
  await page.clock.fastForward(15_000);
  await expect(info).toBeVisible();
  await page.getByRole("link", { name: "About", exact: true }).focus();
  await page.clock.fastForward(9000);
  await expect(info).toBeVisible();
  await page.clock.fastForward(1000);
  await expect(info).toHaveCount(0);

  const second = page.waitForResponse(
    (response) => response.url().endsWith("/api/user/preferences") && response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Theme: Dark. Change theme" }).click();
  const secondResponse = await second;
  expect(secondResponse.ok()).toBe(true);
  expect(secondResponse.request().postDataJSON()).toEqual({ selectedTheme: "light" });
  await page.clock.runFor(1);
  await expect(info).toBeVisible();
  await info.hover();
  await page.clock.fastForward(20_000);
  await expect(info).toBeVisible();
  await page.getByRole("link", { name: "About", exact: true }).hover();
  await page.clock.fastForward(10_000);
  await expect(info).toHaveCount(0);

  const third = page.waitForResponse(
    (response) => response.url().endsWith("/api/user/preferences") && response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Theme: Light. Change theme" }).click();
  expect((await third).ok()).toBe(true);
  await page.clock.runFor(1);
  await info.getByRole("button", { name: "Dismiss preference notice" }).click();
  await expect(info).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Settings", exact: true })).toBeFocused();
});
