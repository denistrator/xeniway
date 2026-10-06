import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

test("declares stable native installation metadata backed by correctly sized opaque icons", async () => {
  expect(await Bun.file("apps/web/pwa-manifest.ts").exists()).toBe(true);
  const { pwaManifest } = await import("../apps/web/pwa-manifest");
  expect(pwaManifest).toMatchObject({
    id: "/",
    name: "Xenia Way",
    short_name: "Xenia Way",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#f5f3ee",
    background_color: "#f5f3ee",
  });
  expect(pwaManifest.icons).toEqual([
    { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ]);
  for (const [name, size] of [
    ["pwa-192", 192],
    ["pwa-512", 512],
    ["pwa-maskable-512", 512],
    ["apple-touch-icon", 180],
  ] as const) {
    const png = await readFile(`apps/web/public/${name}.png`);
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(png.readUInt32BE(16)).toBe(size);
    expect(png.readUInt32BE(20)).toBe(size);
    expect(png[25]).toBe(2); // RGB, no alpha channel.
  }
});

test("links Apple artwork without enabling automatic worker registration", async () => {
  const html = await readFile("apps/web/index.html", "utf8");
  const config = await readFile("apps/web/vite.config.ts", "utf8");
  expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />');
  expect(config).toContain("manifest: pwaManifest");
  expect(config).toContain("injectRegister: false");
  expect(config).toContain("devOptions: { enabled: false }");
});
