import { createWorkerAssets, type PublicAssetEntry } from "./worker-assets";
import { parseWorkerRequest, type WorkerReply } from "./worker-protocol";

// A structural worker scope keeps browser project declarations separate from WebWorker libraries.
type LifetimeEvent = { waitUntil(promise: Promise<unknown>): void };
type WorkerMessage = LifetimeEvent & { data: unknown; ports: readonly MessagePort[]; source: { url?: string } | null };
type WorkerFetch = { request: Request; respondWith(response: Promise<Response>): void };
type OfflineWorkerScope = {
  __WB_MANIFEST: PublicAssetEntry[];
  location: { origin: string };
  clients: {
    matchAll(options: { type: "window"; includeUncontrolled: boolean }): Promise<unknown[]>;
    claim(): Promise<void>;
  };
  addEventListener(type: "message", listener: (event: WorkerMessage) => void): void;
  addEventListener(type: "fetch", listener: (event: WorkerFetch) => void): void;
  addEventListener(type: "activate", listener: (event: LifetimeEvent) => void): void;
};
declare const self: OfflineWorkerScope;
const assets = createWorkerAssets(self.__WB_MANIFEST, self.location.origin);

// No install precaching, skipWaiting, activation-time claiming, or unconditional startup downloads.
self.addEventListener("message", (event) => {
  const message = parseWorkerRequest(event.data);
  const port = event.ports[0];
  if (!message || !port || !event.source?.url || new URL(event.source.url).origin !== self.location.origin) {
    return;
  }
  event.waitUntil(
    (async () => {
      const buildId = await assets.buildId;
      const respond = (reply: WorkerReply) =>
        port.postMessage({
          type: reply.type,
          requestId: reply.requestId,
          buildId: reply.buildId,
          ...(reply.type === "ASSETS_FAILED" && reply.message ? { message: reply.message } : {}),
        });
      const identity = { requestId: message.requestId, buildId };
      if (message.type === "GET_BUILD_ID") {
        respond({ type: "BUILD_ID", ...identity });
        return;
      }
      if (message.buildId !== buildId) {
        respond({ type: "ASSETS_FAILED", ...identity, message: "Offline build identity mismatch" });
        return;
      }
      try {
        await assets.prepare();
        // The client requests first control only after explicit consent, and messages its active worker.
        if (message.claimClients) {
          await self.clients.claim();
        }
        respond({ type: "ASSETS_READY", ...identity });
      } catch (error) {
        respond({
          type: "ASSETS_FAILED",
          ...identity,
          message: error instanceof Error ? error.message : "Offline asset storage failed",
        });
      }
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  if (assets.shouldHandle(event.request)) {
    event.respondWith(assets.respond(event.request).then((response) => response ?? fetch(event.request)));
  }
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => assets.cleanupIfUnused(clients.length)),
  );
});
