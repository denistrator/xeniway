import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assetRevision } from "./worker-asset-revision";
import { createWorkerAssets, type PublicAssetEntry } from "./worker-assets";

const origin = "https://xeniway.example";
const manifest: PublicAssetEntry[] = [
  { url: "index.html", revision: "484772aa8b6e2f1c14b90cf030c0547c05b4944ce879874373e28218f834291d" },
  { url: "assets/index-abc.js", revision: null },
  { url: "assets/ru-def.js", revision: null },
  { url: "assets/uk-ghi.js", revision: null },
  { url: "assets/he-jkl.js", revision: null },
  { url: "assets/workspace-mno.js", revision: null },
  { url: "assets/form-pqr.js", revision: null },
  { url: "assets/index-stu.css", revision: null },
  { url: "favicon.ico", revision: "52e1beae50202a0b007ad5cdfdf08de7dc1657088eac53a09614069a3c8858c1" },
];
class MemoryCache {
  entries = new Map<string, Response>();
  async match(key: RequestInfo | URL) {
    return this.entries.get(String(key instanceof Request ? key.url : key))?.clone();
  }
  async put(key: RequestInfo | URL, response: Response) {
    this.entries.set(String(key instanceof Request ? key.url : key), response.clone());
  }
}
let cacheMap: Map<string, MemoryCache>;
let storage: CacheStorage;
let network: ReturnType<typeof vi.fn<typeof fetch>>;
beforeEach(async () => {
  const { webcrypto } = await vi.importActual<{ webcrypto: Crypto }>("node:crypto");
  cacheMap = new Map();
  storage = {
    open: vi.fn(async (name: string) => {
      if (!cacheMap.has(name)) {
        cacheMap.set(name, new MemoryCache());
      }
      return cacheMap.get(name) as unknown as Cache;
    }),
    keys: async () => [...cacheMap.keys()],
    delete: async (name: string) => cacheMap.delete(name),
  } as unknown as CacheStorage;
  network = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    let contentType = "image/x-icon";
    if (url.endsWith(".html")) {
      contentType = "text/html";
    } else if (url.endsWith(".js")) {
      contentType = "text/javascript";
    } else if (url.endsWith(".css")) {
      contentType = "text/css";
    }
    return new Response(`public:${url}`, { headers: { "content-type": contentType } });
  });
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("caches", storage);
  vi.stubGlobal("fetch", network);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function normalNetwork(): typeof fetch {
  const implementation = network.getMockImplementation();
  if (!implementation) {
    throw new Error("Missing network fixture");
  }
  return implementation;
}
function denyCacheRead(operation: "open" | "match" | "keys", error: Error): void {
  if (operation === "match") {
    vi.spyOn(MemoryCache.prototype, "match").mockRejectedValue(error);
  } else {
    vi.spyOn(storage, operation).mockRejectedValue(error);
  }
}
function navigation(path: string): Request {
  return { url: `${origin}${path}`, method: "GET", mode: "navigate" } as Request;
}

describe("explicit public asset preparation", () => {
  it("prepares all lazy JSON dictionaries and serves them without the network", async () => {
    const dictionaries = ["ru", "uk", "he"].map((locale) => ({
      url: `assets/${locale}-dictionary.json`,
      revision: null,
    }));
    const assets = createWorkerAssets([...manifest, ...dictionaries], origin);
    const fallback = normalNetwork();
    network.mockImplementation(async (input, init) =>
      String(input instanceof Request ? input.url : input).endsWith(".json")
        ? new Response('{"dictionary":"public"}', { headers: { "content-type": "application/json" } })
        : fallback(input, init),
    );
    expect(network).not.toHaveBeenCalled();
    await assets.prepare();
    network.mockRejectedValue(new TypeError("offline"));
    for (const entry of dictionaries) {
      const response = await assets.respond(new Request(`${origin}/${entry.url}`));
      expect(await response?.json()).toEqual({ dictionary: "public" });
    }
  });

  it("rejects HTML masquerading as a lazy JSON dictionary during preparation", async () => {
    const assets = createWorkerAssets([...manifest, { url: "assets/he-dictionary.json", revision: null }], origin);
    const fallback = normalNetwork();
    network.mockImplementation(async (input, init) =>
      String(input instanceof Request ? input.url : input).endsWith(".json")
        ? new Response("<html></html>", { headers: { "content-type": "text/html" } })
        : fallback(input, init),
    );
    await expect(assets.prepare()).rejects.toThrow("Offline asset unavailable: /assets/he-dictionary.json");
  });

  it.each(["application/manifest+json", "application/json"])(
    "caches PWA metadata with %s and icons only after preparation",
    async (contentType) => {
      const pwaEntries = [
        { url: "manifest.webmanifest", revision: null },
        { url: "pwa-192.png", revision: null },
        { url: "pwa-512.png", revision: null },
        { url: "pwa-maskable-512.png", revision: null },
        { url: "apple-touch-icon.png", revision: null },
      ];
      const assets = createWorkerAssets([...manifest, ...pwaEntries], origin);
      expect(network).not.toHaveBeenCalled();
      const fallback = normalNetwork();
      network.mockImplementation(async (input, init) =>
        String(input instanceof Request ? input.url : input).endsWith(".webmanifest")
          ? new Response('{"name":"Xenia Way"}', { headers: { "content-type": contentType } })
          : fallback(input, init),
      );
      await assets.prepare();
      for (const entry of pwaEntries) {
        expect(await assets.respond(new Request(`${origin}/${entry.url}`))).toBeInstanceOf(Response);
      }
    },
  );
  it("rejects SPA HTML returned for the install manifest", async () => {
    const assets = createWorkerAssets([...manifest, { url: "manifest.webmanifest", revision: null }], origin);
    const fallback = normalNetwork();
    network.mockImplementation(async (input, init) =>
      String(input instanceof Request ? input.url : input).endsWith(".webmanifest")
        ? new Response("<html></html>", { headers: { "content-type": "text/html" } })
        : fallback(input, init),
    );
    await expect(assets.prepare()).rejects.toThrow("Offline asset unavailable: /manifest.webmanifest");
  });
  it.each(["open", "match", "keys"] as const)(
    "treats rejected cache %s reads as an asset cache miss",
    async (operation) => {
      const assets = createWorkerAssets(manifest, origin);
      denyCacheRead(operation, new DOMException("Public storage unavailable", "SecurityError"));
      await expect(assets.respond(new Request(`${origin}/assets/index-abc.js`))).resolves.toBeUndefined();
      expect(network).not.toHaveBeenCalled();
    },
  );
  it.each(["open", "match"] as const)(
    "still propagates cache %s errors during explicit preparation",
    async (operation) => {
      const assets = createWorkerAssets(manifest, origin);
      const error = new DOMException("Public storage unavailable", "SecurityError");
      denyCacheRead(operation, error);
      await expect(assets.prepare()).rejects.toBe(error);
      expect(network).not.toHaveBeenCalled();
    },
  );
  it.each([
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["a", "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb"],
    ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    ["message digest", "f7846f55cf23e14eebeab5b4e1550cad5b509e3348fbc4efa3a1413d393cb650"],
    ["abcdefghijklmnopqrstuvwxyz", "71c480df93d6ae2f1efad1447c66c9525e316218cf51fc8d9ed832f2daf18b73"],
    [
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
      "db4bfcbd4da0cd85a60c3c37d3fbd8805c77f15fc6b1fdfe614ee0a7c8fdb4c0",
    ],
  ])("computes the manifest revision for %j", async (body, expected) => {
    expect(await assetRevision(new TextEncoder().encode(body))).toBe(expected);
  });
  it("matches the build-tool digest for binary data over multiple blocks", async () => {
    const { createHash } = await vi.importActual<{
      createHash: (algorithm: string) => { update: (data: Uint8Array) => { digest: (encoding: string) => string } };
    }>("node:crypto");
    for (const length of [55, 56, 63, 64, 65, 1024, 100_000]) {
      const bytes = Uint8Array.from({ length }, (_, index) => (index * 17) % 256);
      expect(await assetRevision(bytes)).toBe(createHash("sha256").update(bytes).digest("hex"));
    }
  });
  it("does not download or open caches when initialized", async () => {
    const assets = createWorkerAssets(manifest, origin);
    expect(await assets.buildId).toMatch(/^[a-f0-9]{64}$/);
    expect(network).not.toHaveBeenCalled();
    expect(storage.open).not.toHaveBeenCalled();
  });
  it("produces stable manifest build IDs and changes them for revised assets", async () => {
    const first = await createWorkerAssets(manifest, origin).buildId;
    expect(await createWorkerAssets([...manifest].reverse(), origin).buildId).toBe(first);
    expect(
      await createWorkerAssets([{ ...manifest[0], revision: "shell-2" }, ...manifest.slice(1)], origin).buildId,
    ).not.toBe(first);
  });
  it("keeps build identity independent of browser locale collation", async () => {
    const first = await createWorkerAssets(manifest, origin).buildId;
    const compare = String.prototype.localeCompare;
    vi.spyOn(String.prototype, "localeCompare").mockImplementation(function (this: string, other: string) {
      return -compare.call(this, other);
    });
    expect(await createWorkerAssets(manifest, origin).buildId).toBe(first);
  });
  it("rejects duplicate manifest entries rather than silently marking ambiguous builds ready", () => {
    expect(() => createWorkerAssets([...manifest, manifest[manifest.length - 1]], origin)).toThrow("unique assets");
  });
  it("downloads every manifest entry only on prepare, without credentials or query strings", async () => {
    const assets = createWorkerAssets(manifest, origin);
    expect(await assets.prepare()).toBe(await assets.buildId);
    expect(network).toHaveBeenCalledTimes(manifest.length);
    for (const [request] of network.mock.calls) {
      expect(request).toBeInstanceOf(Request);
      expect((request as Request).credentials).toBe("omit");
      expect((request as Request).redirect).toBe("error");
      expect(new URL((request as Request).url).search).toBe("");
    }
    await assets.prepare();
    expect(network).toHaveBeenCalledTimes(manifest.length);
  });
  it("coalesces concurrent preparation and retries a failed download", async () => {
    const assets = createWorkerAssets(manifest, origin);
    network.mockRejectedValueOnce(new Error("offline"));
    await expect(assets.prepare()).rejects.toThrow("offline");
    const first = assets.prepare();
    const second = assets.prepare();
    expect(await first).toBe(await second);
    expect(await assets.respond(new Request(`${origin}/assets/ru-def.js`))).toBeInstanceOf(Response);
  });
  it("does not expose any partial build after a failed download", async () => {
    const assets = createWorkerAssets(manifest, origin);
    network.mockResolvedValueOnce(new Response("failed", { status: 503 }));
    await expect(assets.prepare()).rejects.toThrow();
    network.mockRejectedValue(new Error("offline"));
    await expect(assets.respond(navigation("/"))).rejects.toThrow("offline");
  });
  it("propagates cache quota failures and can retry without readiness", async () => {
    const assets = createWorkerAssets(manifest, origin);
    const error = new DOMException("Quota exhausted", "QuotaExceededError");
    const put = vi.spyOn(MemoryCache.prototype, "put").mockRejectedValueOnce(error);
    await expect(assets.prepare()).rejects.toBe(error);
    put.mockRestore();
    expect(await assets.prepare()).toBe(await assets.buildId);
  });
  it.each([
    "https://other.example/file.js",
    "api/auth/me",
    "index.html?token=secret",
    "reset-password",
    "assets/../api/me",
    "unknown.html",
    "manifest.webmanifest?token=secret",
    "pwa-512.png#private",
    "pwa-other.png",
  ])("rejects unsafe manifest entry %s", (url) => {
    expect(() => createWorkerAssets([{ url, revision: "1" }], origin)).toThrow();
  });
  it("rejects redirect/HTML fallback responses for generated script URLs", async () => {
    const assets = createWorkerAssets(manifest, origin);
    network.mockResolvedValue(new Response("<html>login</html>", { headers: { "content-type": "text/html" } }));
    await expect(assets.prepare()).rejects.toThrow();
  });
  it("serves prepared generated assets without fetching", async () => {
    const assets = createWorkerAssets(manifest, origin);
    await assets.prepare();
    network.mockClear();
    const result = await assets.respond(new Request(`${origin}/assets/he-jkl.js`));
    expect(await result?.text()).toBe(`public:${origin}/assets/he-jkl.js`);
    expect(network).not.toHaveBeenCalled();
  });
  it.each(["/", "/settings", "/archive", "/blacklist", "/applications/3", "/login", "/register", "/forgot-password"])(
    "falls back to the clean shell for known navigation %s",
    async (path) => {
      const assets = createWorkerAssets(manifest, origin);
      await assets.prepare();
      network.mockRejectedValue(new Error("offline"));
      expect(await (await assets.respond(navigation(path)))?.text()).toBe(`public:${origin}/index.html`);
      expect([...cacheMap.values()][0].entries.has(`${origin}${path}`)).toBe(false);
    },
  );
  it.each([
    "/api/auth/me",
    "/api/applications",
    "/reset-password?token=secret",
    "/?secret=1",
    "/applications/3?token=secret",
    "/unknown",
    "/reset-password",
    "/login?token=secret",
    "/assets/unknown.js",
    "/assets/ru-def.js?token=secret",
  ])("does not handle or cache private/unlisted requests %s", async (path) => {
    const assets = createWorkerAssets(manifest, origin);
    await assets.prepare();
    network.mockClear();
    const request = path.includes("assets") ? new Request(`${origin}${path}`) : navigation(path);
    expect(assets.shouldHandle(request)).toBe(path === "/assets/unknown.js");
    expect(await assets.respond(request)).toBeUndefined();
    expect(network).not.toHaveBeenCalled();
  });
  it("ignores mutations and cross-origin requests", async () => {
    const assets = createWorkerAssets(manifest, origin);
    for (const request of [
      new Request(`${origin}/index.html`, { method: "POST" }),
      new Request("https://jobs.example/assets/index-abc.js"),
    ]) {
      expect(assets.shouldHandle(request)).toBe(false);
    }
  });
  it("retains old public caches while any clients remain and only cleans its own namespace", async () => {
    const assets = createWorkerAssets(manifest, origin);
    await assets.prepare();
    cacheMap.set("xeniway-public-old", new MemoryCache());
    cacheMap.set("another-app", new MemoryCache());
    await assets.cleanupIfUnused(1);
    expect(cacheMap.has("xeniway-public-old")).toBe(true);
    await assets.cleanupIfUnused(0);
    expect(cacheMap.has("xeniway-public-old")).toBe(false);
    expect(cacheMap.has("another-app")).toBe(true);
    expect(cacheMap.size).toBe(2);
  });
  it("serves the previous prepared build after normal activation until the new build is prepared", async () => {
    const old = createWorkerAssets(manifest, origin);
    await old.prepare();
    const newer = createWorkerAssets(
      [
        { url: "index.html", revision: "shell-2" },
        { url: "assets/new-xyz.js", revision: null },
      ],
      origin,
    );
    await newer.cleanupIfUnused(0);
    network.mockRejectedValue(new Error("offline"));
    expect(await (await newer.respond(navigation("/")))?.text()).toBe(`public:${origin}/index.html`);
    expect(await (await newer.respond(new Request(`${origin}/assets/index-abc.js`)))?.text()).toBe(
      `public:${origin}/assets/index-abc.js`,
    );
  });
  it("rejects an old manifest downloading a newer deployment shell before any readiness marker", async () => {
    const assets = createWorkerAssets(manifest, origin);
    const normal = normalNetwork();
    network.mockImplementation(async (input, init) => {
      const url = String(input instanceof Request ? input.url : input);
      return url.endsWith("index.html")
        ? new Response('<script type="module" src="/assets/new-build.js"></script>', {
            headers: { "content-type": "text/html" },
          })
        : normal(input, init);
    });
    await expect(assets.prepare()).rejects.toThrow("revision");
    expect([...cacheMap.values()].some((cache) => cache.entries.has(`${origin}/__xeniway_public_assets_ready__`))).toBe(
      false,
    );
    expect(cacheMap.size).toBe(0);
  });
  it("rejects revision changes even when the shell references stay identical", async () => {
    const assets = createWorkerAssets(manifest, origin);
    const normal = normalNetwork();
    network.mockImplementation(async (input, init) => {
      const url = String(input instanceof Request ? input.url : input);
      return url.endsWith("index.html")
        ? new Response(`public:${url}<!--different deployment-->`, { headers: { "content-type": "text/html" } })
        : normal(input, init);
    });
    await expect(assets.prepare()).rejects.toThrow("revision");
  });
  it("verifies unversioned favicon revisions as well as the shell", async () => {
    const assets = createWorkerAssets(manifest, origin);
    const normal = normalNetwork();
    network.mockImplementation(async (input, init) => {
      const url = String(input instanceof Request ? input.url : input);
      return url.endsWith("favicon.ico")
        ? new Response("different icon", { headers: { "content-type": "image/x-icon" } })
        : normal(input, init);
    });
    await expect(assets.prepare()).rejects.toThrow("revision");
  });
  it("revalidates existing complete cache bodies before reporting preparation ready", async () => {
    const assets = createWorkerAssets(manifest, origin);
    await assets.prepare();
    await [...cacheMap.values()][0].put(
      `${origin}/index.html`,
      new Response("corrupt shell", { headers: { "content-type": "text/html" } }),
    );
    network.mockClear();
    await assets.prepare();
    expect(network).toHaveBeenCalledTimes(manifest.length);
    expect(await (await [...cacheMap.values()][0].match(`${origin}/index.html`))?.text()).toBe(
      `public:${origin}/index.html`,
    );
  });
  it("bounds previous generations during the real activation-before-preparation sequence", async () => {
    const generation = (name: string) =>
      createWorkerAssets([manifest[0], { url: `assets/${name}.js`, revision: null }], origin);
    const a = generation("a");
    await a.prepare();
    const aName = `xeniway-public-${await a.buildId}`;
    const b = generation("b");
    await b.cleanupIfUnused(0);
    await b.prepare();
    expect(cacheMap.has(aName)).toBe(true);
    const bName = `xeniway-public-${await b.buildId}`;
    const c = generation("c");
    await c.cleanupIfUnused(0);
    expect(cacheMap.has(aName)).toBe(false);
    expect(cacheMap.has(bName)).toBe(true);
    network.mockRejectedValueOnce(new Error("offline"));
    expect(await (await c.respond(navigation("/")))?.text()).toBe(`public:${origin}/index.html`);
    await c.prepare();
    expect([...cacheMap.keys()].filter((key) => key.startsWith("xeniway-public-")).length).toBeLessThanOrEqual(2);
  });
  it("retains every prepared generation while any window client remains", async () => {
    for (const name of ["a", "b", "c"]) {
      await createWorkerAssets([manifest[0], { url: `assets/${name}.js`, revision: null }], origin).prepare();
    }
    const next = createWorkerAssets([manifest[0], { url: "assets/next.js", revision: null }], origin);
    const names = [...cacheMap.keys()];
    await next.cleanupIfUnused(1);
    expect([...cacheMap.keys()]).toEqual(names);
  });
  it("keeps the newest complete fallback rather than a newer partial or corrupt cache", async () => {
    const a = createWorkerAssets(manifest, origin);
    await a.prepare();
    const aName = `xeniway-public-${await a.buildId}`;
    const partial = createWorkerAssets([manifest[0], { url: "assets/partial.js", revision: null }], origin);
    await partial.prepare();
    cacheMap.get(`xeniway-public-${await partial.buildId}`)?.entries.delete(`${origin}/assets/partial.js`);
    const corrupt = new MemoryCache();
    await corrupt.put(`${origin}/__xeniway_public_assets_ready__`, new Response("invalid JSON"));
    cacheMap.set("xeniway-public-corrupt", corrupt);
    cacheMap.set("another-app", new MemoryCache());
    const next = createWorkerAssets([{ ...manifest[0], revision: "changed" }, ...manifest.slice(1)], origin);
    await next.cleanupIfUnused(0);
    expect([...cacheMap.keys()]).toEqual([aName, "another-app"]);
  });
});

describe("worker event wiring", () => {
  async function worker() {
    const listeners = new Map<string, (event: unknown) => void>();
    const claim = vi.fn(async () => {});
    vi.stubGlobal("self", {
      __WB_MANIFEST: manifest,
      location: { origin },
      clients: { matchAll: async () => [], claim },
      addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener),
    });
    vi.resetModules();
    await import("./service-worker");
    async function message(data: unknown, source = `${origin}/`) {
      const replies: Record<string, unknown>[] = [];
      let completion: Promise<unknown> | undefined;
      listeners.get("message")?.({
        data,
        source: { url: source },
        ports: [{ postMessage: (reply: Record<string, unknown>) => replies.push(reply) }],
        waitUntil: (promise: Promise<unknown>) => {
          completion = promise;
        },
      });
      await completion;
      return replies;
    }
    return { listeners, message, claim };
  }
  it.each([
    ["open", "assets/index-abc.js"],
    ["match", "assets/index-stu.css"],
    ["keys", "assets/ru-def.js"],
  ] as const)("serves online %s-cache-denied requests from the network (%s)", async (operation, path) => {
    const { listeners } = await worker();
    denyCacheRead(operation, new DOMException("Public storage unavailable", "SecurityError"));
    const request = new Request(`${origin}/${path}`);
    const respondWith = vi.fn<(response: Promise<Response>) => void>();
    listeners.get("fetch")?.({ request, respondWith });
    expect(respondWith).toHaveBeenCalledOnce();
    const response = await respondWith.mock.calls[0][0];
    expect(await response.text()).toBe(`public:${request.url}`);
    expect(network).toHaveBeenCalledExactlyOnceWith(request);
    expect(cacheMap.size).toBeLessThanOrEqual(1);
  });
  it("preserves a network failure after denied asset-cache reads", async () => {
    const { listeners } = await worker();
    denyCacheRead("open", new DOMException("Public storage unavailable", "SecurityError"));
    const offline = new TypeError("Network unavailable");
    network.mockRejectedValue(offline);
    const request = new Request(`${origin}/assets/index-abc.js`);
    const respondWith = vi.fn<(response: Promise<Response>) => void>();
    listeners.get("fetch")?.({ request, respondWith });
    await expect(respondWith.mock.calls[0][0]).rejects.toBe(offline);
    expect(network).toHaveBeenCalledExactlyOnceWith(request);
  });
  it("reports denied public storage during explicit preparation without claiming clients", async () => {
    const { message, claim } = await worker();
    const [build] = await message({ type: "GET_BUILD_ID", requestId: "build" });
    denyCacheRead("open", new DOMException("Public storage unavailable", "SecurityError"));
    expect(
      await message({ type: "PREPARE_ASSETS", requestId: "prepare", buildId: build.buildId, claimClients: true }),
    ).toEqual([
      { type: "ASSETS_FAILED", requestId: "prepare", buildId: build.buildId, message: "Offline asset storage failed" },
    ]);
    expect(claim).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
  });
  it("registers no install downloader and never handles activation requests", async () => {
    const { listeners, message } = await worker();
    expect([...listeners.keys()]).toEqual(["message", "fetch", "activate"]);
    await message({ type: "SKIP_WAITING", requestId: "request-1" });
    expect(network).not.toHaveBeenCalled();
    expect(storage.open).not.toHaveBeenCalled();
  });
  it("correlates build discovery and explicit preparation replies", async () => {
    const { message } = await worker();
    const [build] = await message({ type: "GET_BUILD_ID", requestId: "request-1" });
    expect(build).toMatchObject({ type: "BUILD_ID", requestId: "request-1" });
    expect(network).not.toHaveBeenCalled();
    expect(await message({ type: "PREPARE_ASSETS", requestId: "request-2", buildId: build.buildId })).toEqual([
      { type: "ASSETS_READY", requestId: "request-2", buildId: build.buildId },
    ]);
    expect(network).toHaveBeenCalledTimes(manifest.length);
  });
  it("rejects stale build IDs and ignores cross-origin clients", async () => {
    const { message } = await worker();
    expect(await message({ type: "PREPARE_ASSETS", requestId: "request-1", buildId: "stale" })).toMatchObject([
      { type: "ASSETS_FAILED", requestId: "request-1" },
    ]);
    expect(await message({ type: "GET_BUILD_ID", requestId: "request-2" }, "https://other.example/")).toEqual([]);
    expect(network).not.toHaveBeenCalled();
  });
  it.each([undefined, null, 1])(
    "returns correlated build failures for invalid preparation identity %j",
    async (buildId) => {
      const { message, claim } = await worker();
      const [build] = await message({ type: "GET_BUILD_ID", requestId: "discover" });
      expect(await message({ type: "PREPARE_ASSETS", requestId: "prepare", buildId, claimClients: true })).toEqual([
        {
          type: "ASSETS_FAILED",
          requestId: "prepare",
          buildId: build.buildId,
          message: "Offline build identity mismatch",
        },
      ]);
      expect(network).not.toHaveBeenCalled();
      expect(storage.open).not.toHaveBeenCalled();
      expect(claim).not.toHaveBeenCalled();
    },
  );
  it("reports failed downloads without emitting ASSETS_READY", async () => {
    const { message } = await worker();
    const [build] = await message({ type: "GET_BUILD_ID", requestId: "request-1" });
    network.mockRejectedValue(new Error("offline"));
    expect(await message({ type: "PREPARE_ASSETS", requestId: "request-2", buildId: build.buildId })).toEqual([
      { type: "ASSETS_FAILED", requestId: "request-2", buildId: build.buildId, message: "offline" },
    ]);
  });
  it("omits empty worker failure detail so the client keeps its fallback error", async () => {
    const { message } = await worker();
    const [build] = await message({ type: "GET_BUILD_ID", requestId: "discover" });
    network.mockRejectedValue(new Error(""));
    expect(await message({ type: "PREPARE_ASSETS", requestId: "prepare", buildId: build.buildId })).toEqual([
      { type: "ASSETS_FAILED", requestId: "prepare", buildId: build.buildId },
    ]);
  });
  it("leaves API fetches entirely outside respondWith", async () => {
    const { listeners } = await worker();
    const respondWith = vi.fn();
    listeners.get("fetch")?.({ request: new Request(`${origin}/api/auth/me`), respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  });
  it("claims an initially uncontrolled tab only after successful explicit preparation", async () => {
    const { message, claim } = await worker();
    const [build] = await message({ type: "GET_BUILD_ID", requestId: "first" });
    expect(claim).not.toHaveBeenCalled();
    const replies = await message({
      type: "PREPARE_ASSETS",
      requestId: "prepare",
      buildId: build.buildId,
      claimClients: true,
    });
    expect(claim).toHaveBeenCalledOnce();
    expect(replies).toMatchObject([{ type: "ASSETS_READY" }]);
    expect(network).toHaveBeenCalledTimes(manifest.length);
  });
  it("does not claim for existing controllers or failed preparation", async () => {
    const { message, claim } = await worker();
    const [build] = await message({ type: "GET_BUILD_ID", requestId: "first" });
    await message({ type: "PREPARE_ASSETS", requestId: "existing", buildId: build.buildId });
    expect(claim).not.toHaveBeenCalled();
    // A separate unprepared worker/cache makes the download failure observable.
    cacheMap.clear();
    network.mockRejectedValue(new Error("offline"));
    expect(
      await message({ type: "PREPARE_ASSETS", requestId: "failed", buildId: build.buildId, claimClients: true }),
    ).toMatchObject([{ type: "ASSETS_FAILED" }]);
    expect(claim).not.toHaveBeenCalled();
  });
  it("reports claim failures before announcing ASSETS_READY", async () => {
    const { message, claim } = await worker();
    const [build] = await message({ type: "GET_BUILD_ID", requestId: "first" });
    claim.mockRejectedValueOnce(new Error("Not active"));
    expect(
      await message({ type: "PREPARE_ASSETS", requestId: "prepare", buildId: build.buildId, claimClients: true }),
    ).toMatchObject([{ type: "ASSETS_FAILED", message: "Not active" }]);
  });
});
