import { expect, test } from "@playwright/test";
import type { ApplicationResponse, AuthResponse, CsrfResponse } from "@xeniway/shared";

test("persists before-card and end-of-column drag ordering", async ({ page }) => {
  const bootstrap = await page.request.get("/api/auth/csrf");
  const registration = await page.request.post("/api/auth/register", {
    headers: { "x-csrf-token": ((await bootstrap.json()) as CsrfResponse).data.csrfToken },
    data: { email: `board-order-${crypto.randomUUID()}@example.com`, password: "password123" },
  });
  expect(registration.ok()).toBe(true);
  const headers = { "x-csrf-token": ((await registration.json()) as AuthResponse).data.csrfToken };
  expect((await page.request.post("/api/user/preferences/introduced", { headers })).ok()).toBe(true);
  const ids: number[] = [];
  for (const application of [
    { company: "Short card", position: "Candidate" },
    {
      company: "Detailed card",
      position: "Principal Platform Engineer",
      location: "Hybrid · Kyiv, Ukraine",
      description:
        "Lead reliable developer infrastructure. Partner with security and product engineering to improve deployment safety, observability, and platform ergonomics.",
    },
  ]) {
    const created = await page.request.post("/api/applications", {
      headers,
      data: { ...application, status: "saved" },
    });
    expect(created.ok()).toBe(true);
    ids.push(((await created.json()) as ApplicationResponse).data.application.id);
  }
  expect(
    (
      await page.request.post("/api/applications/reorder", {
        headers,
        data: { status: "saved", applicationIds: ids },
      })
    ).ok(),
  ).toBe(true);
  await page.goto("/");
  const saved = page.getByRole("region", { name: "Saved applications" });
  const shortCard = saved.getByRole("link", { name: /^Short card,/ });
  const detailedCard = saved.getByRole("link", { name: /^Detailed card,/ });
  await expect(shortCard).toBeVisible();
  await expect(detailedCard).toBeVisible();
  await expect(saved.getByRole("link").first()).toContainText("Short card");
  const response = page.waitForResponse(
    (result) => result.url().endsWith("/api/applications/reorder") && result.request().method() === "POST",
  );
  await detailedCard.dragTo(saved.locator("ul > li").first(), { targetPosition: { x: 20, y: 2 } });
  const reordered = await response;
  expect(reordered.ok()).toBe(true);
  expect(reordered.request().postDataJSON()).toEqual({ status: "saved", applicationIds: [ids[1], ids[0]] });
  await expect(saved.getByRole("link").first()).toContainText("Detailed card");
  await page.reload();
  await expect(saved.getByRole("link").first()).toContainText("Detailed card");
  const columnBounds = await saved.boundingBox();
  if (!columnBounds) {
    throw new Error("The Saved column is unavailable for the end-of-column drop");
  }
  const appended = page.waitForResponse(
    (result) => result.url().endsWith("/api/applications/reorder") && result.request().method() === "POST",
  );
  await detailedCard.dragTo(saved, { targetPosition: { x: 16, y: columnBounds.height - 8 } });
  const appendedResponse = await appended;
  expect(appendedResponse.ok()).toBe(true);
  expect(appendedResponse.request().postDataJSON()).toEqual({ status: "saved", applicationIds: ids });
  await expect(saved.getByRole("link").last()).toContainText("Detailed card");
  await page.reload();
  await expect(saved.getByRole("link").last()).toContainText("Detailed card");
});
