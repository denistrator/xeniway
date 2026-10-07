import { parseWorkerReply, type WorkerRequest } from "./worker-protocol";

const WORKER_TIMEOUT_MS = 30_000;
const ASSET_TIMEOUT_MS = 120_000;

async function registerWorker(): Promise<ServiceWorkerRegistration> {
  if (import.meta.env.DEV) {
    throw new Error("Offline access requires a production build");
  }
  if (!("serviceWorker" in navigator) || typeof MessageChannel === "undefined") {
    throw new Error("Offline service workers are unavailable");
  }
  return navigator.serviceWorker.register("/service-worker.js", { scope: "/", updateViaCache: "none" });
}
function activeWorker(registration: ServiceWorkerRegistration): Promise<ServiceWorker> {
  if (registration.active?.state === "activated") {
    return Promise.resolve(registration.active);
  }
  const worker = registration.installing ?? registration.active ?? registration.waiting;
  if (!worker) {
    return Promise.reject(new Error("Offline worker unavailable"));
  }
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      worker.removeEventListener("statechange", changed);
      if (error) {
        reject(error);
      } else {
        resolve(worker);
      }
    };
    const changed = () => {
      switch (worker.state) {
        case "activated":
          finish();
          break;
        case "redundant":
          finish(new Error("Offline worker installation failed"));
          break;
      }
    };
    const timeout = setTimeout(() => finish(new Error("Offline worker activation timed out")), WORKER_TIMEOUT_MS);
    worker.addEventListener("statechange", changed);
    changed();
  });
}
function send(worker: ServiceWorker, request: WorkerRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const release = () => {
      clearTimeout(timeout);
      channel.port1.onmessage = null;
      channel.port1.close();
      channel.port2.close();
    };
    const fail = (error: Error) => {
      release();
      reject(error);
    };
    const timeout = setTimeout(() => fail(new Error("Offline asset preparation timed out")), ASSET_TIMEOUT_MS);
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      try {
        const reply = parseWorkerReply(event.data, request);
        if (reply.type === "ASSETS_FAILED") {
          fail(new Error(reply.message));
        } else {
          release();
          resolve(reply.buildId);
        }
      } catch (error) {
        fail(error instanceof Error ? error : new Error("Offline worker messaging failed"));
      }
    };
    channel.port1.start();
    try {
      worker.postMessage(
        {
          type: request.type,
          requestId: request.requestId,
          ...(request.type === "PREPARE_ASSETS"
            ? { buildId: request.buildId, ...(request.claimClients ? { claimClients: true } : {}) }
            : {}),
        },
        [channel.port2],
      );
    } catch (error) {
      fail(error instanceof Error ? error : new Error("Offline worker messaging failed"));
    }
  });
}

/** Call only after explicit opt-in. Existing controllers keep their current build until normal activation. */
export async function prepareOfflineAssets(): Promise<string> {
  const worker = await activeWorker(await registerWorker());
  const buildId = await send(worker, { type: "GET_BUILD_ID", requestId: crypto.randomUUID() });
  return send(worker, {
    type: "PREPARE_ASSETS",
    requestId: crypto.randomUUID(),
    buildId,
    claimClients: navigator.serviceWorker.controller === null,
  });
}

/** Call only for a restored opt-in account; updates are notifications, never forced activation/reloads. */
export function checkOfflineWorkerUpdate(onUpdateAvailable: () => void): () => void {
  if (import.meta.env.DEV) {
    return () => {};
  }
  let disposed = false;
  const cleanup: (() => void)[] = [];
  void registerWorker()
    .then((registration) => {
      if (disposed) {
        return;
      }
      const notified = new WeakSet<ServiceWorker>();
      const notify = () => {
        if (!disposed && registration.waiting && registration.active && !notified.has(registration.waiting)) {
          notified.add(registration.waiting);
          onUpdateAvailable();
        }
      };
      const observe = () => {
        const worker = registration.installing;
        if (worker) {
          worker.addEventListener("statechange", notify);
          cleanup.push(() => worker.removeEventListener("statechange", notify));
        }
        notify();
      };
      registration.addEventListener("updatefound", observe);
      cleanup.push(() => registration.removeEventListener("updatefound", observe));
      observe();
      void registration.update().catch(() => {});
    })
    .catch(() => {
      /* Unsupported storage/worker environments continue online; explicit preparation reports errors. */
    });
  return () => {
    disposed = true;
    for (const release of cleanup) {
      release();
    }
  };
}
