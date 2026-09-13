import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiRequestError,
  applicationKeys,
  confirmPasswordReset,
  getUserPreferences,
  listApplications,
  markUserIntroduced,
  parseApiError,
  requestPasswordReset,
  updateUserPreferences,
  userPreferencesKeys,
} from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("web API helpers", () => {
  it("extracts the stable API error message", () => {
    expect(parseApiError({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } })).toEqual({
      code: "VALIDATION_ERROR",
      message: "Validation failed",
    });
  });

  it("falls back safely for malformed API error payloads", () => {
    expect(parseApiError(null)).toEqual({ code: "REQUEST_FAILED", message: "The request failed" });
    expect(parseApiError("<!doctype html>")).toEqual({ code: "REQUEST_FAILED", message: "The request failed" });
  });

  it("creates isolated query keys for active and archived applications", () => {
    expect(applicationKeys.list("active")).toEqual(["applications", "list", "active"]);
    expect(applicationKeys.list("archive")).toEqual(["applications", "list", "archive"]);
    expect(applicationKeys.list("blacklist")).toEqual(["applications", "list", "blacklist"]);
  });

  it("requests active applications without serializing a query context as status", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => new Response(JSON.stringify({ data: { applications: [] } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await listApplications();

    expect(fetchMock).toHaveBeenCalledWith("/api/applications", expect.anything());
  });

  it("keeps preference state isolated and protects completion with CSRF", async () => {
    expect(userPreferencesKeys.current(1)).toEqual(["user-preferences", "current", 1]);
    const fetchMock = vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ data: { preferences: { wasIntroduced: false } } }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await getUserPreferences();
    await markUserIntroduced("csrf-token");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/user/preferences",
      expect.objectContaining({ credentials: "include" }),
    );
    const request = fetchMock.mock.calls[1]?.[1];
    if (!request) throw new Error("Expected the preference completion request");
    expect((request.headers as Headers).get("x-csrf-token")).toBe("csrf-token");
    expect(request.method).toBe("POST");
  });

  it("keeps API error identity and HTTP status together", () => {
    const error = new ApiRequestError("Unauthenticated", "UNAUTHENTICATED", 401);
    expect(error).toMatchObject({ code: "UNAUTHENTICATED", status: 401, message: "Unauthenticated" });
    expect(error.name).toBe("ApiRequestError");
  });

  it("updates user preferences with a JSON body and CSRF protection", async () => {
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(JSON.stringify({ data: { preferences: { selectedLanguage: "uk", selectedTheme: "dark" } } }), {
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;

    await expect(
      updateUserPreferences({ selectedLanguage: "uk", selectedTheme: "dark" }, "csrf-token", signal),
    ).resolves.toEqual({
      data: { preferences: { selectedLanguage: "uk", selectedTheme: "dark" } },
    });

    const request = fetchMock.mock.calls[0]?.[1];
    if (!request) throw new Error("Expected the preference update request");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/user/preferences",
      expect.objectContaining({ method: "PATCH", credentials: "include" }),
    );
    expect((request.headers as Headers).get("content-type")).toBe("application/json");
    expect((request.headers as Headers).get("x-csrf-token")).toBe("csrf-token");
    expect(request.signal).toBe(signal);
    expect(request.body).toBe(JSON.stringify({ selectedLanguage: "uk", selectedTheme: "dark" }));
  });

  it("sends password reset mutations with the CSRF header", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => new Response(JSON.stringify({ data: { message: "ok" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await requestPasswordReset({ email: "candidate@example.com" }, "csrf-token");
    await confirmPasswordReset(
      { token: "reset-token", password: "password123", passwordConfirmation: "password123" },
      "csrf-token",
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/auth/password-reset/request",
      expect.objectContaining({ method: "POST", credentials: "include", headers: expect.any(Headers) }),
    );
    const firstRequest = fetchMock.mock.calls[0]?.[1];
    if (!firstRequest) throw new Error("Expected the first request");
    expect((firstRequest.headers as Headers).get("x-csrf-token")).toBe("csrf-token");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/password-reset/confirm",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });
});
