import { expect, type Page, test } from "@playwright/test";
import { createRedisClient } from "../../apps/api/src/redis/client";

test.beforeEach(async () => {
  const redis = createRedisClient("redis://localhost:6379/15");
  await redis.connect();
  try {
    await redis.flushDb();
  } finally {
    await redis.close();
  }
});

async function login(page: Page) {
  const csrf = await page.request.get("/api/auth/csrf");
  const token = (await csrf.json()).data.csrfToken;
  const response = await page.request.post("/api/auth/login", {
    headers: { "x-csrf-token": token },
    data: { email: "admin@example.com", password: "password" },
  });
  expect(response.ok()).toBe(true);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Applications", exact: true })).toBeVisible();
}

async function openOfflineSettings(page: Page) {
  await page.getByRole("link", { name: /^Settings(?: —|$)/ }).click();
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Offline access on this device", exact: true })).toBeVisible();
}

async function prepare(page: Page) {
  await openOfflineSettings(page);
  await page
    .getByRole("checkbox", { name: "I understand and want to store my application data on this device." })
    .check();
  await page.getByRole("button", { name: "Make available offline on this device", exact: true }).click();
  await expect(page.getByText(/Ready offline until/)).toBeVisible({ timeout: 60_000 });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page
    .getByRole("navigation", { name: "Workspace navigation" })
    .getByRole("link", { name: "Applications", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Applications", exact: true })).toBeVisible();
}

test("ordinary startup does not register a worker or load the create host before consent", async ({ page }) => {
  const scripts: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "script") {
      scripts.push(request.url());
    }
  });
  await login(page);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
  expect(scripts.some((url) => /job-manager-host/.test(url))).toBe(false);
  await openOfflineSettings(page);
  await expect(page.getByRole("button", { name: "Make available offline on this device", exact: true })).toBeDisabled();
});

test("omits initial HTML module hints but retains lazy-route preloading", async ({ page }) => {
  const response = await page.request.get("/login");
  expect(response.ok()).toBe(true);
  expect(await response.text()).not.toMatch(/<link\b[^>]*rel=["']modulepreload["']/i);
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.locator('link[rel="modulepreload"]').first()).toBeAttached();
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
});

test("publishes native installation metadata without preparing offline data", async ({ page }) => {
  await page.goto("/login");
  const link = page.locator('link[rel="manifest"]');
  await expect(link).toHaveAttribute("href", "/manifest.webmanifest");
  const response = await page.request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toMatch(/application\/(manifest\+json|json)/);
  const manifest = await response.json();
  expect(manifest).toMatchObject({ id: "/", name: "Xenia Way", start_url: "/", scope: "/", display: "standalone" });
  for (const icon of manifest.icons) {
    const dimensions = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      return `${image.naturalWidth}x${image.naturalHeight}`;
    }, icon.src);
    expect(dimensions).toBe(icon.sizes);
  }
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/apple-touch-icon.png");
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
  expect(await page.evaluate(async () => await caches.keys())).toEqual([]);
});

test("keeps install metadata and icons available offline after explicit preparation", async ({ page, context }) => {
  await login(page);
  await prepare(page);
  await context.setOffline(true);
  const metadata = await page.evaluate(async () => {
    const response = await fetch("/manifest.webmanifest");
    const manifest = await response.json();
    const icons = await Promise.all(
      [...manifest.icons.map((icon: { src: string }) => icon.src), "/apple-touch-icon.png"].map(async (src) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        return image.naturalWidth;
      }),
    );
    return { name: manifest.name, icons };
  });
  expect(metadata).toEqual({ name: "Xenia Way", icons: [192, 512, 512, 180] });
});

test("cold signed-out login still acquires CSRF and submits normally", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Applications", exact: true })).toBeVisible();
});

test("a transient server error without a download stays on the requested board and recovers through Retry", async ({
  page,
}) => {
  await login(page);
  await page.route("**/api/applications/archive", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "INTERNAL_SERVER_ERROR", message: "Server error" } }),
    }),
  );
  await page
    .getByRole("navigation", { name: "Workspace navigation" })
    .getByRole("link", { name: "Archive", exact: true })
    .click();
  await expect(page).toHaveURL(/\/archive$/);
  await expect(page.getByRole("link", { name: "Settings — Offline or server unavailable", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Offline access on this device" })).toHaveCount(0);
  await openOfflineSettings(page);
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
  await expect(page.getByText(/cached applications are read-only/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Add job", exact: true })).toBeDisabled();
  await expect(page.getByText(/Ready offline until/)).toHaveCount(0);
  let checks = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/auth/me") {
      checks += 1;
    }
  });
  await page.unroute("**/api/applications/archive");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add job", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Workspace navigation" })
    .getByRole("link", { name: "Archive", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Restore", exact: true }).first()).toBeVisible();
  expect(checks).toBeGreaterThan(0);
  await expect(page).toHaveURL(/\/archive$/);
});

test("a delayed pre-logout session response cannot reopen the board after another tab signs out", async ({
  page,
  context,
}) => {
  await login(page);
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.getByRole("heading", { name: "Applications", exact: true })).toBeVisible();
  let release!: () => void;
  let intercepted = false;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/auth/me", async (route) => {
    const response = await route.fetch();
    intercepted = true;
    await held;
    await route.fulfill({ response });
  });
  try {
    await page.evaluate(() => window.dispatchEvent(new Event("xeniway:retry-connection")));
    await expect.poll(() => intercepted).toBe(true);
    await other.getByRole("button", { name: "Logout", exact: true }).click();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
    const completed = page.waitForResponse("**/api/auth/me");
    release();
    await completed;
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add job", exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    release();
    await other.close();
  }
});

test("offline workspace read views cannot enter editing and an existing editor can still cancel", async ({
  page,
  context,
}) => {
  await login(page);
  await prepare(page);
  const applications = (await (await page.request.get("/api/applications")).json()).data.applications;
  const application = applications.find((item: { company: string }) => item.company === "MAXED");
  expect(application).toBeTruthy();
  await page.goto(`/applications/${application.id}`);
  const research = page.getByRole("region", { name: "Company research", exact: true });
  await research.locator("p").first().click();
  const input = research.getByRole("textbox", { name: "Company research", exact: true });
  await expect(input).toBeVisible();
  await research.getByRole("button", { name: "Cancel", exact: true }).focus();
  await context.setOffline(true);
  await expect(research.getByRole("button", { name: "Save company research", exact: true })).toBeDisabled();
  await expect(research.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  await research.getByRole("button", { name: "Cancel", exact: true }).press("Escape");
  await expect(input).toHaveCount(0);
  await research.locator("p").first().click();
  await expect(input).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "MAXED", exact: true })).toBeVisible();
});

test("a confirmation opened online remains dismissible when the workspace becomes read-only", async ({
  page,
  context,
}) => {
  await login(page);
  await prepare(page);
  const application = (await (await page.request.get("/api/applications")).json()).data.applications[0];
  await page.goto(`/applications/${application.id}`);
  await page.getByRole("button", { name: "Archive application", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await context.setOffline(true);
  await expect(dialog.getByRole("button", { name: "Archive application", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "No", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "No", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Archive application", exact: true })).toBeDisabled();
});

test("offline reload opens never-visited workspaces from every board without writes or API caches", async ({
  page,
  context,
}) => {
  await login(page);
  await prepare(page);
  const lists = await Promise.all(
    ["/api/applications", "/api/applications/archive", "/api/applications/blacklist"].map(
      async (url) =>
        (await (await page.request.get(url)).json()).data.applications as Array<{
          id: number;
          company: string;
          status: string;
        }>,
    ),
  );
  const application = lists[0][0];
  const ids = [...new Set(lists.flatMap((list) => list.map((item) => item.id)))].sort((a, b) => a - b);
  await expect
    .poll(() =>
      page.evaluate(async (id) => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const open = indexedDB.open("xeniway-offline");
          open.onsuccess = () => resolve(open.result);
          open.onerror = () => reject(open.error);
        });
        try {
          return await new Promise<boolean>((resolve) => {
            const request = db.transaction("snapshots").objectStore("snapshots").getAll();
            request.onsuccess = () =>
              resolve(
                request.result.some((record) =>
                  record.snapshot.queries.some(
                    (query: { queryKey: unknown[] }) => query.queryKey[2] === "detail" && query.queryKey[3] === id,
                  ),
                ),
              );
          });
        } finally {
          db.close();
        }
      }, application.id),
    )
    .toBe(true);
  expect(
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const request = indexedDB.open("xeniway-offline");
        request.onsuccess = () => resolve(request.result);
      });
      try {
        return await new Promise<number[]>((resolve) => {
          const request = db.transaction("snapshots").objectStore("snapshots").getAll();
          request.onsuccess = () =>
            resolve(
              request.result
                .flatMap((record) =>
                  record.snapshot.queries
                    .filter((query: { queryKey: unknown[] }) => query.queryKey[2] === "detail")
                    .map((query: { queryKey: unknown[] }) => query.queryKey[3]),
                )
                .sort((a: number, b: number) => a - b),
            );
        });
      } finally {
        db.close();
      }
    }),
  ).toEqual(ids);
  let writes = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET") {
      writes += 1;
    }
  });
  await context.setOffline(true);
  await page.reload();
  for (const list of lists) {
    expect(list.length).toBeGreaterThan(0);
    await page.goto(`/applications/${list[0].id}`);
    await expect(page.getByRole("heading", { name: list[0].company, exact: true })).toBeVisible();
    const ordered = ["saved", "applied", "interview", "offer", "rejected", "withdrawn"].flatMap((status) =>
      list.filter((item) => item.status === status),
    );
    const currentIndex = ordered.findIndex((item) => item.id === list[0].id);
    const next = page.getByRole("button", { name: "Next application" });
    if (ordered.length > 1) {
      await next.click();
      await expect(
        page.getByRole("heading", { name: ordered[(currentIndex + 1) % ordered.length].company, exact: true }),
      ).toBeFocused();
      await page.getByRole("button", { name: "Previous application" }).click();
      await expect(page.getByRole("heading", { name: list[0].company, exact: true })).toBeFocused();
    } else {
      await expect(next).toBeDisabled();
    }
  }
  await expect(page.getByRole("link", { name: "Settings — Offline or server unavailable", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Offline access on this device" })).toHaveCount(0);
  await openOfflineSettings(page);
  await expect(
    page.getByRole("heading", { name: "Offline access on this device — Offline or server unavailable", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/cached applications are read-only/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  for (const [route, title, action] of [
    ["/", "Applications", "Delete all active applications"],
    ["/archive", "Archive", "Delete all archived applications"],
    ["/blacklist", "Blacklist", "Delete all blacklisted applications"],
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await page.getByText("Board actions", { exact: true }).click();
    await expect(page.getByRole("button", { name: action, exact: true })).toBeDisabled();
  }
  await page.goto("/applications/2147483647");
  await expect(page.getByText("This workspace has not been downloaded. Connect to open it.")).toBeVisible();
  const cachedUrls = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const key of await caches.keys()) {
      for (const request of await (await caches.open(key)).keys()) {
        urls.push(request.url);
      }
    }
    return urls;
  });
  expect(cachedUrls.length).toBeGreaterThan(0);
  expect(cachedUrls.some((url) => /\/api\//.test(url) || /token=/.test(url))).toBe(false);
  await context.setOffline(false);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Add job", exact: true })).toBeEnabled();
  expect(writes).toBe(0);
});

test("refresh replaces complete workspace downloads with visible progress", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await prepare(page);
  const application = (await (await page.request.get("/api/applications")).json()).data.applications[0];
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/applications/${application.id}`, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.preparation.companyResearch = "Research refreshed before going offline";
    await held;
    await route.fulfill({ response, json: body });
  });
  await openOfflineSettings(page);
  try {
    const refresh = page.getByRole("button", { name: "Refresh offline data", exact: true });
    await refresh.focus();
    await refresh.press("Enter");
    await expect(page.getByText(/Downloaded \d+ of \d+ workspaces…/)).toBeVisible();
    await expect(page.getByText(/Ready offline until/)).toHaveCount(0);
    await expect(refresh).toBeFocused();
    await expect(page.getByRole("button", { name: "Refresh offline data", exact: true })).toBeDisabled();
    await page
      .getByRole("navigation", { name: "Workspace navigation" })
      .getByRole("link", { name: "Applications", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "Applications", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Offline access on this device" })).toHaveCount(0);
    await openOfflineSettings(page);
    await expect(page.getByText(/Downloaded \d+ of \d+ workspaces…/)).toBeVisible();
    await page.getByRole("button", { name: "Refresh offline data", exact: true }).focus();
  } finally {
    release();
  }
  await expect(page.getByText(/Ready offline until/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh offline data", exact: true })).toBeFocused();
  await page.unroute(`**/api/applications/${application.id}`);
  await context.setOffline(true);
  await page.goto(`/applications/${application.id}`);
  await expect(page.getByText("Research refreshed before going offline", { exact: true })).toBeVisible();
});

test("a failed workspace download does not leave a partial ready snapshot", async ({ page }) => {
  await login(page);
  const application = (await (await page.request.get("/api/applications")).json()).data.applications[0];
  await page.route(`**/api/applications/${application.id}`, (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "INTERNAL_SERVER_ERROR", message: "Server error" } }),
    }),
  );
  await openOfflineSettings(page);
  await page
    .getByRole("checkbox", { name: "I understand and want to store my application data on this device." })
    .check();
  await page.getByRole("button", { name: "Make available offline on this device", exact: true }).click();
  await expect(page.getByText(/Offline data could not be saved or read/)).toBeVisible();
  await expect(page.getByText(/Ready offline until/)).toHaveCount(0);
  expect(
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const request = indexedDB.open("xeniway-offline");
        request.onsuccess = () => resolve(request.result);
      });
      try {
        return await new Promise<number>((resolve) => {
          const request = db.transaction("snapshots").objectStore("snapshots").count();
          request.onsuccess = () => resolve(request.result);
        });
      } finally {
        db.close();
      }
    }),
  ).toBe(0);
});

test("all lazy locales and RTL survive offline reload", async ({ page, context }) => {
  await login(page);
  await prepare(page);
  await context.setOffline(true);
  for (const locale of ["en", "ru", "uk", "he"]) {
    await page.evaluate((language) => {
      const preferences = JSON.parse(localStorage.getItem("userPreferences") ?? "{}");
      localStorage.setItem("userPreferences", JSON.stringify({ ...preferences, language }));
    }, locale);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "he" ? "rtl" : "ltr");
    await expect(page.getByRole("main")).toBeVisible();
  }
});

test("a confirmed 401 clears the downloaded account on reconnect", async ({ page, context }) => {
  await login(page);
  await prepare(page);
  await context.setOffline(true);
  await page.reload();
  await context.clearCookies();
  await context.setOffline(false);
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(async () => {
      const open = indexedDB.open("xeniway-offline");
      const db = await new Promise<IDBDatabase>((resolve) => {
        open.onsuccess = () => resolve(open.result);
      });
      try {
        return await new Promise<number>((resolve) => {
          const count = db.transaction("accounts").objectStore("accounts").count();
          count.onsuccess = () => resolve(count.result);
        });
      } finally {
        db.close();
      }
    }),
  ).toBe(0);
});

test("offline logout clears private device data and explains the remote-session limit", async ({ page, context }) => {
  await login(page);
  await prepare(page);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("region", { name: "Offline access on this device" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Settings/ })).toHaveCount(0);
  await page.goto("/settings");
  await expect(page.getByText(/Your remote session could not be revoked/)).toBeVisible();
  await page.goto("/login");
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
});

test("denied device storage does not break online browsing or claim readiness", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      get() {
        throw new DOMException("Denied", "SecurityError");
      },
    }),
  );
  await login(page);
  await openOfflineSettings(page);
  await page
    .getByRole("checkbox", { name: "I understand and want to store my application data on this device." })
    .check();
  await page.getByRole("button", { name: "Make available offline on this device", exact: true }).click();
  await expect(page.getByText(/Offline data could not be saved or read/)).toBeVisible();
  await expect(page.getByText(/Ready offline until/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add job", exact: true })).toBeEnabled();
});

test("expired downloads cannot grant access after an offline reload", async ({ page, context }) => {
  await login(page);
  await prepare(page);
  await page.evaluate(async () => {
    const open = indexedDB.open("xeniway-offline");
    const db = await new Promise<IDBDatabase>((resolve) => {
      open.onsuccess = () => resolve(open.result);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("accounts", "readwrite");
        const store = tx.objectStore("accounts");
        const get = store.get("active");
        get.onsuccess = () =>
          store.put(
            { ...get.result, verifiedAt: Date.now() - 8 * 86400000, expiresAt: Date.now() - 86400000 },
            "active",
          );
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("link", { name: "Applications", exact: true })).toHaveCount(0);
});

test("removing downloads in another tab removes cached-device access", async ({ page, context }) => {
  await login(page);
  await prepare(page);
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByRole("heading", { name: "Applications", exact: true })).toBeVisible();
  await context.setOffline(true);
  await openOfflineSettings(page);
  await page.getByRole("button", { name: "Remove offline data", exact: true }).click();
  await expect(second).toHaveURL(/\/login$/);
  await expect(second.getByRole("link", { name: "Applications", exact: true })).toHaveCount(0);
});
