import { assetRevision } from "./worker-asset-revision";

export type PublicAssetEntry = { url: string; revision: string | null };
type PublicCacheManifest = { buildId: string; urls: string[] };
type ReadinessCheck = "marker" | "complete";
const CACHE_PREFIX = "xeniway-public-";
const NAVIGATION_PATHS = new Set([
  "/",
  "/index.html",
  "/archive",
  "/blacklist",
  "/about",
  "/settings",
  "/login",
  "/register",
  "/forgot-password",
]);
function publicAsset(url: URL): boolean {
  if (url.search || url.hash) {
    return false;
  }
  const isPublicDocument = url.pathname === "/index.html" || url.pathname === "/manifest.webmanifest";
  const isInstallIcon = /^\/(pwa-(192|512|maskable-512)|apple-touch-icon)\.png$/.test(url.pathname);
  const isFavicon = /^\/favicon\.(ico|png)$/.test(url.pathname);
  const isGeneratedAsset = /^\/assets\/[\w.-]+\.(js|css|json|png|svg|ico|woff2?)$/.test(url.pathname);
  return isPublicDocument || isInstallIcon || isFavicon || isGeneratedAsset;
}
function navigation(request: Request): boolean {
  const path = new URL(request.url).pathname;
  return request.mode === "navigate" && (NAVIGATION_PATHS.has(path) || /^\/applications\/[1-9]\d*$/.test(path));
}
function validContent(url: string, response: Response): boolean {
  if (!response.ok || response.redirected || response.type === "opaque") {
    return false;
  }
  const type = response.headers.get("content-type")?.split(";")[0].trim();
  if (url.endsWith(".html")) {
    return type === "text/html";
  }
  if (url.endsWith(".webmanifest")) {
    return ["application/manifest+json", "application/json"].includes(type ?? "");
  }
  if (url.endsWith(".json")) {
    return type === "application/json";
  }
  if (url.endsWith(".js")) {
    return ["application/javascript", "text/javascript"].includes(type ?? "");
  }
  if (url.endsWith(".css")) {
    return type === "text/css";
  }
  if (/\.(png|svg|ico)$/.test(url)) {
    return type?.startsWith("image/") ?? false;
  }
  return type?.startsWith("font/") || type === "application/font-woff" || type === "application/octet-stream";
}

/** Manifest injection describes public build output; it never triggers downloads by itself. */
export function createWorkerAssets(manifest: PublicAssetEntry[], origin: string) {
  const entries = manifest
    .map((entry) => {
      const url = new URL(entry.url, `${origin}/`);
      const isPublicUrl = url.origin === origin && publicAsset(url);
      const hasTraversal = entry.url.includes("..");
      const hasInvalidRevision = entry.revision !== null && typeof entry.revision !== "string";
      if (!isPublicUrl || hasTraversal || hasInvalidRevision) {
        throw new Error("Unsafe offline asset manifest");
      }
      return { url: url.href, revision: entry.revision };
    })
    .sort((a, b) => {
      if (a.url < b.url) {
        return -1;
      }
      if (a.url > b.url) {
        return 1;
      }
      return 0;
    });
  if (
    !entries.some((entry) => entry.url === `${origin}/index.html`) ||
    new Set(entries.map((entry) => entry.url)).size !== entries.length
  ) {
    throw new Error("Offline manifest requires one clean shell and unique assets");
  }
  const urls = new Set(entries.map((entry) => entry.url));
  const marker = `${origin}/__xeniway_public_assets_ready__`;
  const buildId = assetRevision(new TextEncoder().encode(JSON.stringify({ version: 1, entries })));
  const cacheName = buildId.then((id) => `${CACHE_PREFIX}${id}`);
  let preparing: Promise<string> | null = null;
  async function validRevision(entry: PublicAssetEntry, response: Response): Promise<boolean> {
    if (entry.revision === null) {
      return true;
    }
    const isDigest = /^[a-f0-9]{64}$/.test(entry.revision);
    if (!isDigest) {
      return false;
    }
    const bodyRevision = await assetRevision(new Uint8Array(await response.clone().arrayBuffer()));
    return bodyRevision === entry.revision;
  }
  async function readReadyManifest(cache: Cache, name: string): Promise<PublicCacheManifest | null> {
    const markerResponse = await cache.match(marker);
    if (!markerResponse) {
      return null;
    }
    let value: unknown;
    try {
      value = await markerResponse.json();
    } catch {
      return null;
    }
    if (
      !value ||
      typeof value !== "object" ||
      !("buildId" in value) ||
      typeof value.buildId !== "string" ||
      name !== `${CACHE_PREFIX}${value.buildId}` ||
      !("urls" in value) ||
      !Array.isArray(value.urls) ||
      !value.urls.includes(`${origin}/index.html`) ||
      !value.urls.every((url) => {
        if (typeof url !== "string") {
          return false;
        }
        try {
          const parsed = new URL(url);
          return parsed.origin === origin && publicAsset(parsed);
        } catch {
          return false;
        }
      })
    ) {
      return null;
    }
    return { buildId: value.buildId, urls: value.urls };
  }
  async function isCurrentBuildReady(cache: Cache, check: ReadinessCheck): Promise<boolean> {
    const ready = await readReadyManifest(cache, await cacheName);
    if (
      !ready ||
      ready.buildId !== (await buildId) ||
      ready.urls.length !== urls.size ||
      !ready.urls.every((url) => urls.has(url))
    ) {
      return false;
    }
    return (
      check === "marker" ||
      (
        await Promise.all(
          entries.map(async (entry) => {
            const response = await cache.match(entry.url);
            if (!response) {
              return false;
            }
            return validContent(entry.url, response) && (await validRevision(entry, response));
          }),
        )
      ).every(Boolean)
    );
  }
  async function readPreviousAsset(
    cache: Cache,
    name: string,
    url: string,
    check: ReadinessCheck,
  ): Promise<Response | undefined> {
    const ready = await readReadyManifest(cache, name);
    if (!ready?.urls.includes(url)) {
      return undefined;
    }
    // Shell fallback needs every referenced asset; individual asset fallback needs only its own response.
    if (check === "complete" && !(await Promise.all(ready.urls.map((entry) => cache.match(entry)))).every(Boolean)) {
      return undefined;
    }
    return cache.match(url);
  }

  async function findPreviousAsset(url: string, check: ReadinessCheck): Promise<Response | undefined> {
    const current = await cacheName;
    for (const name of (await caches.keys()).reverse()) {
      if (!name.startsWith(CACHE_PREFIX) || name === current) {
        continue;
      }
      const cache = await caches.open(name);
      const response = await readPreviousAsset(cache, name, url, check);
      if (response) {
        return response;
      }
    }
    return undefined;
  }
  async function prepare(): Promise<string> {
    const id = await buildId;
    const name = await cacheName;
    const cache = await caches.open(name);
    if (await isCurrentBuildReady(cache, "complete")) {
      return id;
    }
    try {
      const responses = await Promise.all(
        entries.map(async (entry) => {
          const response = await fetch(
            new Request(entry.url, { credentials: "omit", cache: "reload", redirect: "error" }),
          );
          const wasRedirected = Boolean(response.url && response.url !== entry.url);
          if (!validContent(entry.url, response) || wasRedirected) {
            throw new Error(`Offline asset unavailable: ${new URL(entry.url).pathname}`);
          }
          if (!(await validRevision(entry, response))) {
            throw new Error(`Offline asset revision mismatch: ${new URL(entry.url).pathname}`);
          }
          return response;
        }),
      );
      for (let i = 0; i < entries.length; i++) {
        await cache.put(entries[i].url, responses[i]);
      }
      await cache.put(
        marker,
        new Response(JSON.stringify({ buildId: id, urls: [...urls] }), {
          headers: { "content-type": "application/json" },
        }),
      );
      return id;
    } catch (error) {
      // Partial builds have no readiness marker and cannot be served. Preserve other build caches.
      await caches.delete(name).catch(() => {});
      throw error;
    }
  }
  function shouldHandle(request: Request): boolean {
    const url = new URL(request.url);
    const isSameOriginRead = request.method === "GET" && url.origin === origin;
    const isCleanUrl = !url.search && !url.hash;
    if (!isSameOriginRead || !isCleanUrl) {
      return false;
    }
    const isPublicRequest = publicAsset(url) || navigation(request);
    return isPublicRequest;
  }

  async function findCachedAsset(url: string, check: ReadinessCheck): Promise<Response | undefined> {
    const cache = await caches.open(await cacheName);
    if (urls.has(url) && (await isCurrentBuildReady(cache, check))) {
      const response = await cache.match(url);
      if (response) {
        return response;
      }
    }
    return findPreviousAsset(url, check);
  }

  async function respondToNavigation(request: Request): Promise<Response> {
    try {
      return await fetch(request);
    } catch (error) {
      const shell = await findCachedAsset(`${origin}/index.html`, "complete");
      if (shell) {
        return shell;
      }
      throw error;
    }
  }

  async function hasCompletePublicAssets(cache: Cache, name: string): Promise<boolean> {
    const ready = await readReadyManifest(cache, name);
    if (!ready) {
      return false;
    }
    return (
      await Promise.all(
        ready.urls.map(async (url) => {
          const response = await cache.match(url);
          if (!response) {
            return false;
          }
          return validContent(url, response);
        }),
      )
    ).every(Boolean);
  }

  return {
    buildId,
    prepare(): Promise<string> {
      if (!preparing) {
        preparing = prepare().finally(() => {
          preparing = null;
        });
      }
      return preparing;
    },
    shouldHandle,
    async respond(request: Request): Promise<Response | undefined> {
      if (!shouldHandle(request)) {
        return undefined;
      }
      if (navigation(request)) {
        return respondToNavigation(request);
      }
      try {
        return await findCachedAsset(request.url, "marker");
      } catch {
        // Public caching is optional for ordinary asset requests. Let the fetch
        // handler use the original network request; explicit preparation still rejects.
        return undefined;
      }
    },
    async cleanupIfUnused(clientCount: number): Promise<void> {
      if (clientCount !== 0) {
        return;
      }
      const name = await cacheName;
      let previousKept = false;
      // CacheStorage.keys preserves creation order. Retain the newest complete previous
      // generation even when this newly activated build has not been opted into yet.
      for (const key of (await caches.keys()).reverse()) {
        if (!key.startsWith(CACHE_PREFIX)) {
          continue;
        }
        const cache = await caches.open(key);
        const complete = await hasCompletePublicAssets(cache, key);
        const shouldKeepGeneration = key === name || !previousKept;
        if (complete && shouldKeepGeneration) {
          previousKept = previousKept || key !== name;
          continue;
        }
        await caches.delete(key);
      }
    },
  };
}
