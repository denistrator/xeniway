import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, applicationKeys, confirmPasswordReset, parseApiError, requestPasswordReset } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("web API helpers", () => {
  it("extracts the stable API error message", () => {
    expect(parseApiError({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } })).toEqual({
      code: "VALIDATION_ERROR",
      message: "Validation failed",
    });
  });

  it("creates isolated query keys for active and archived applications", () => {
    expect(applicationKeys.list("active")).toEqual(["applications", "list", "active"]);
    expect(applicationKeys.list("archive")).toEqual(["applications", "list", "archive"]);
    expect(applicationKeys.list("blacklist")).toEqual(["applications", "list", "blacklist"]);
  });

  it("keeps API error identity and HTTP status together", () => {
    const error = new ApiRequestError("Unauthenticated", "UNAUTHENTICATED", 401);
    expect(error).toMatchObject({ code: "UNAUTHENTICATED", status: 401, message: "Unauthenticated" });
    expect(error.name).toBe("ApiRequestError");
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
