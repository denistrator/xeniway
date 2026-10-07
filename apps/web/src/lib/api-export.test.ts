import { afterEach, expect, test, vi } from "vitest";
import { ApiRequestError, exportApplicationsCsv, setAuthenticatedRequestGuard } from "./api";

afterEach(() => {
  setAuthenticatedRequestGuard(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("downloads ZIP bytes with session credentials and a server-provided filename", async () => {
  const bytes = new Uint8Array([80, 75, 3, 4]);
  const fetch = vi.fn().mockResolvedValue(
    new Response(bytes, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": 'attachment; filename="xenia-way-export-2026-10-07.zip"',
      },
    }),
  );
  vi.stubGlobal("fetch", fetch);
  const result = await exportApplicationsCsv();
  expect(fetch).toHaveBeenCalledWith("/api/applications/export.zip", { credentials: "include" });
  expect(result.filename).toBe("xenia-way-export-2026-10-07.zip");
  expect(result.blob.type).toBe("application/zip");
  expect(new Uint8Array(await result.blob.arrayBuffer())).toEqual(bytes);
});

test.each([null, 'attachment; filename="../../private.zip"', 'attachment; filename="unexpected.html"'])(
  "uses a safe fallback for disposition %j",
  async (disposition) => {
    const headers = new Headers({ "content-type": "application/zip" });
    if (disposition !== null) {
      headers.set("content-disposition", disposition);
    }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("zip bytes", { headers })));
    expect((await exportApplicationsCsv()).filename).toBe("xenia-way-export.zip");
  },
);

test("preserves structured API errors and announces an expired session", async () => {
  const events = vi.spyOn(window, "dispatchEvent");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "Session expired" } }), {
        status: 401,
      }),
    ),
  );
  await expect(exportApplicationsCsv()).rejects.toMatchObject({
    code: "UNAUTHENTICATED",
    message: "Session expired",
    status: 401,
  });
  expect(events.mock.calls.map(([event]) => event.type)).toEqual(["xeniway:auth-expired"]);
});

test("handles non-JSON error responses without treating them as a download", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Bad gateway", { status: 502 })));
  await expect(exportApplicationsCsv()).rejects.toBeInstanceOf(ApiRequestError);
});

test("propagates network failures", async () => {
  const failure = new TypeError("Network unavailable");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(failure));
  await expect(exportApplicationsCsv()).rejects.toBe(failure);
});

test.each(["offline", "unverified"])("does not request an export when %s", async (state) => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  if (state === "offline") {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  } else {
    setAuthenticatedRequestGuard(() => {
      throw new ApiRequestError("Verify session", "OFFLINE_READ_ONLY", 0);
    });
  }
  await expect(exportApplicationsCsv()).rejects.toMatchObject({ code: "OFFLINE_READ_ONLY" });
  expect(fetch).not.toHaveBeenCalled();
});
