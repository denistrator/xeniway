import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkOfflineWorkerUpdate, prepareOfflineAssets } from "./register-offline-worker";

class Worker extends EventTarget {
  state = "activated";
  messages: unknown[] = [];
  reply: (message: Record<string, unknown>) => unknown = (message) => ({
    type: message.type === "GET_BUILD_ID" ? "BUILD_ID" : "ASSETS_READY",
    requestId: message.requestId,
    buildId: "build-1",
  });
  postMessage(message: Record<string, unknown>, ports: MessagePort[]) {
    this.messages.push(message);
    queueMicrotask(() => ports[0].postMessage(this.reply(message)));
  }
}
class Registration extends EventTarget {
  active: Worker | null = new Worker();
  waiting: Worker | null = null;
  installing: Worker | null = null;
  update = vi.fn(async () => this);
}
class Channel {
  static instances: Channel[] = [];
  port1 = { onmessage: null as ((event: { data: unknown }) => void) | null, close: vi.fn(), start: vi.fn() };
  port2 = { postMessage: (data: unknown) => this.port1.onmessage?.({ data }), close: vi.fn() };
  constructor() {
    Channel.instances.push(this);
  }
}
let registration: Registration;
let register: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubEnv("DEV", false);
  Channel.instances = [];
  registration = new Registration();
  register = vi.fn(async () => registration);
  vi.stubGlobal("MessageChannel", Channel);
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { register, controller: registration.active },
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("consent-gated worker registration", () => {
  it("rejects preparation in development without requesting a worker script", async () => {
    vi.stubEnv("DEV", true);
    await expect(prepareOfflineAssets()).rejects.toThrow("Offline access requires a production build");
    expect(register).not.toHaveBeenCalled();
  });
  it("does not watch worker updates on the development server", async () => {
    vi.stubEnv("DEV", true);
    const stop = checkOfflineWorkerUpdate(vi.fn());
    await Promise.resolve();
    stop();
    expect(register).not.toHaveBeenCalled();
  });
  it("does not register at module import or normal startup", () => {
    expect(register).not.toHaveBeenCalled();
  });
  it("registers explicitly and returns the correlated prepared build ID", async () => {
    expect(await prepareOfflineAssets()).toBe("build-1");
    expect(register).toHaveBeenCalledWith("/service-worker.js", { scope: "/", updateViaCache: "none" });
    const messages = registration.active?.messages as Record<string, unknown>[];
    expect(messages.map((message) => message.type)).toEqual(["GET_BUILD_ID", "PREPARE_ASSETS"]);
    expect(messages[1].buildId).toBe("build-1");
    expect(messages[0].requestId).not.toBe(messages[1].requestId);
  });
  it("waits for first worker activation without taking over an existing controller", async () => {
    const worker = new Worker();
    worker.state = "installing";
    registration.active = null;
    registration.installing = worker;
    const preparing = prepareOfflineAssets();
    await vi.waitFor(() => expect(register).toHaveBeenCalled());
    registration.active = worker;
    worker.state = "activated";
    worker.dispatchEvent(new Event("statechange"));
    expect(await preparing).toBe("build-1");
    expect(worker.messages).not.toContainEqual({ type: "SKIP_WAITING" });
  });
  it("propagates worker preparation failure", async () => {
    if (registration.active)
      registration.active.reply = (message) => ({
        type: message.type === "GET_BUILD_ID" ? "BUILD_ID" : "ASSETS_FAILED",
        requestId: message.requestId,
        buildId: "build-1",
        message: "Quota exhausted",
      });
    await expect(prepareOfflineAssets()).rejects.toThrow("Quota exhausted");
  });
  it("rejects mismatched request IDs and build IDs", async () => {
    if (registration.active)
      registration.active.reply = () => ({ type: "ASSETS_READY", requestId: "other", buildId: "other-build" });
    await expect(prepareOfflineAssets()).rejects.toThrow();
  });
  it("propagates unsupported and denied registration", async () => {
    Reflect.deleteProperty(navigator, "serviceWorker");
    await expect(prepareOfflineAssets()).rejects.toThrow();
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register } });
    register.mockRejectedValueOnce(new DOMException("Denied", "SecurityError"));
    await expect(prepareOfflineAssets()).rejects.toThrow("Denied");
  });
  it("notifies of waiting updates without sending activation messages", async () => {
    registration.waiting = new Worker();
    const callback = vi.fn();
    const cleanup = checkOfflineWorkerUpdate(callback);
    await vi.waitFor(() => expect(callback).toHaveBeenCalledOnce());
    expect(registration.waiting.messages).toEqual([]);
    expect(registration.active?.messages).toEqual([]);
    cleanup();
  });
  it("observes newly installed updates and cleans up listeners", async () => {
    const callback = vi.fn();
    const cleanup = checkOfflineWorkerUpdate(callback);
    await vi.waitFor(() => expect(registration.update).toHaveBeenCalled());
    const worker = new Worker();
    worker.state = "installing";
    registration.installing = worker;
    registration.dispatchEvent(new Event("updatefound"));
    registration.waiting = worker;
    worker.state = "installed";
    worker.dispatchEvent(new Event("statechange"));
    expect(callback).toHaveBeenCalledOnce();
    cleanup();
    worker.dispatchEvent(new Event("statechange"));
    expect(callback).toHaveBeenCalledOnce();
  });
  it("cleanup before registration resolves suppresses notifications", async () => {
    const callback = vi.fn();
    registration.waiting = new Worker();
    const cleanup = checkOfflineWorkerUpdate(callback);
    cleanup();
    await Promise.resolve();
    await Promise.resolve();
    expect(callback).not.toHaveBeenCalled();
  });
  it("rejects a matching request ID paired with the wrong preparation build", async () => {
    if (registration.active)
      registration.active.reply = (message) => ({
        type: message.type === "GET_BUILD_ID" ? "BUILD_ID" : "ASSETS_READY",
        requestId: message.requestId,
        buildId: message.type === "GET_BUILD_ID" ? "build-1" : "build-2",
      });
    await expect(prepareOfflineAssets()).rejects.toThrow("identity mismatch");
  });
  it("rejects a silent worker after a bounded timeout", async () => {
    vi.useFakeTimers();
    if (registration.active) registration.active.postMessage = () => {};
    const assertion = expect(prepareOfflineAssets()).rejects.toThrow("timed out");
    await vi.runAllTimersAsync();
    await assertion;
    expect(Channel.instances).toHaveLength(1);
    expect(Channel.instances[0].port1.close).toHaveBeenCalledOnce();
    expect(Channel.instances[0].port2.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("releases both message channels and timers after successful preparation", async () => {
    vi.useFakeTimers();
    await expect(prepareOfflineAssets()).resolves.toBe("build-1");
    expect(Channel.instances).toHaveLength(2);
    for (const channel of Channel.instances) {
      expect(channel.port1.close).toHaveBeenCalledOnce();
      expect(channel.port2.close).toHaveBeenCalledOnce();
    }
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(["invalid reply", "postMessage failure"])("releases ports and timers after %s", async (failure) => {
    vi.useFakeTimers();
    if (!registration.active) throw new Error("Missing worker fixture");
    if (failure === "invalid reply") registration.active.reply = () => null;
    else
      registration.active.postMessage = () => {
        throw new Error("postMessage denied");
      };
    await expect(prepareOfflineAssets()).rejects.toThrow(
      failure === "invalid reply" ? "identity mismatch" : "postMessage denied",
    );
    expect(Channel.instances).toHaveLength(1);
    expect(Channel.instances[0].port1.close).toHaveBeenCalledOnce();
    expect(Channel.instances[0].port2.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("removes its activation listener after the thirty-second timeout", async () => {
    vi.useFakeTimers();
    const worker = new Worker();
    worker.state = "installing";
    registration.active = null;
    registration.installing = worker;
    const remove = vi.spyOn(worker, "removeEventListener");
    const assertion = expect(prepareOfflineAssets()).rejects.toThrow("Offline worker activation timed out");
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
    expect(remove).toHaveBeenCalledWith("statechange", expect.any(Function));
    expect(Channel.instances).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("requests first control only for an initially uncontrolled tab", async () => {
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register, controller: null } });
    await prepareOfflineAssets();
    expect(registration.active?.messages[1]).toMatchObject({ type: "PREPARE_ASSETS", claimClients: true });
  });
  it("does not request controller changes for an already controlled tab", async () => {
    await prepareOfflineAssets();
    expect(registration.active?.messages[1]).not.toHaveProperty("claimClients", true);
  });
});
