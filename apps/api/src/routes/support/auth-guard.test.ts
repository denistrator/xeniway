import { describe, expect, it, vi } from "vitest";
import type { AuthService } from "../../services/auth";
import type { ResponseSet } from "../support";
import { requireAuthenticatedMutation, requireAuthenticatedUser, requireValidCsrf } from "./auth-guard";

function createSet(): ResponseSet {
  return { status: 200, headers: {} } as ResponseSet;
}

function createAuth(overrides: Partial<AuthService> = {}): AuthService {
  return {
    getCurrentUser: vi.fn().mockResolvedValue({
      id: 7,
      email: "candidate@example.com",
      firstName: null,
      lastName: null,
      createdAt: "2026-09-01",
    }),
    verifyCsrf: vi.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as AuthService;
}

describe("authenticated route guards", () => {
  it("returns a 401 response when the request has no authenticated user", async () => {
    const set = createSet();
    const auth = createAuth({ getCurrentUser: vi.fn().mockResolvedValue(null) });

    const result = await requireAuthenticatedUser(auth, set, new Request("http://localhost"));

    expect(set.status).toBe(401);
    expect(result).toEqual({
      ok: false,
      response: { error: { code: "UNAUTHENTICATED", message: "Unauthenticated" } },
    });
  });

  it("returns the authenticated user and session for a valid session cookie", async () => {
    const set = createSet();
    const auth = createAuth();
    const request = new Request("http://localhost", { headers: { cookie: "session_id=session-123" } });

    const result = await requireAuthenticatedUser(auth, set, request);

    expect(result).toEqual({
      ok: true,
      context: {
        sessionId: "session-123",
        userId: 7,
        user: { id: 7, email: "candidate@example.com", firstName: null, lastName: null, createdAt: "2026-09-01" },
      },
    });
    expect(set.status).toBe(200);
  });

  it("returns a 403 response when an authenticated mutation has an invalid CSRF token", async () => {
    const set = createSet();
    const auth = createAuth({ verifyCsrf: vi.fn().mockResolvedValue(false) });
    const request = new Request("http://localhost", {
      headers: { cookie: "session_id=session-123" },
    });

    const result = await requireAuthenticatedMutation(auth, set, request);

    expect(set.status).toBe(403);
    expect(result).toEqual({
      ok: false,
      response: { error: { code: "CSRF_ERROR", message: "Invalid CSRF token" } },
    });
  });

  it("allows an authenticated mutation with a valid CSRF token", async () => {
    const set = createSet();
    const auth = createAuth();
    const request = new Request("http://localhost", {
      headers: { cookie: "session_id=session-123", "x-csrf-token": "csrf-123" },
    });

    const result = await requireAuthenticatedMutation(auth, set, request);

    expect(result).toMatchObject({ ok: true, context: { sessionId: "session-123", userId: 7 } });
    expect(auth.verifyCsrf).toHaveBeenCalledWith("session-123", "csrf-123");
  });

  it("returns a 403 CSRF error for public authentication flows without a valid token", async () => {
    const set = createSet();
    const auth = createAuth({ verifyCsrf: vi.fn().mockResolvedValue(false) });
    const request = new Request("http://localhost", { headers: { cookie: "session_id=session-123" } });

    const result = await requireValidCsrf(auth, set, request);

    expect(set.status).toBe(403);
    expect(result).toEqual({ error: { code: "CSRF_ERROR", message: "Invalid CSRF token" } });
  });

  it("allows a public authentication flow with a valid CSRF token", async () => {
    const set = createSet();
    const auth = createAuth();
    const request = new Request("http://localhost", {
      headers: { cookie: "session_id=session-123", "x-csrf-token": "csrf-123" },
    });

    const result = await requireValidCsrf(auth, set, request);

    expect(result).toBeNull();
  });
});
