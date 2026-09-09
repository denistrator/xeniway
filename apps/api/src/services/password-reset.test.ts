import type { PasswordResetConfirmInput, PasswordResetRequestInput } from "@job-tracker/shared";
import { describe, expect, it } from "vitest";
import type { PasswordResetTokenRepository, SessionRepository, UserRepository } from "../db/repository";
import type { PasswordHasher } from "./auth";
import type { PasswordResetMailer } from "./mailer";
import { PasswordResetService } from "./password-reset";
import type { RateLimiter } from "./rate-limit";

function createHarness() {
  const users = new Map([
    [
      7,
      {
        id: 7,
        email: "candidate@example.com",
        passwordHash: "old-hash",
        firstName: null,
        lastName: null,
        createdAt: new Date(),
      },
    ],
  ]);
  const resetTokens: Array<{ userId: number; tokenHash: string; expiresAt: Date; usedAt?: Date }> = [];
  const sessions = new Set(["session-1"]);
  const sent: Array<{ to: string; resetUrl: string }> = [];
  const userRepository = {
    findByEmail: async (email: string) => [...users.values()].find((user) => user.email === email) ?? null,
    findById: async (id: number) => users.get(id) ?? null,
    create: async () => {
      throw new Error("unused");
    },
    updatePasswordHash: async (id: number, passwordHash: string) => {
      const user = users.get(id);
      if (!user) return false;
      user.passwordHash = passwordHash;
      return true;
    },
  } satisfies UserRepository;
  const sessionRepository = {
    create: async () => {},
    findActive: async () => null,
    delete: async (id: string) => {
      sessions.delete(id);
    },
    deleteForUser: async () => sessions.clear(),
    deleteExpired: async () => {},
  } satisfies SessionRepository;
  const tokenRepository = {
    invalidateForUser: async (userId: number) => {
      for (const token of resetTokens) if (token.userId === userId && !token.usedAt) token.usedAt = new Date();
    },
    create: async (input: { userId: number; tokenHash: string; expiresAt: Date }) => {
      resetTokens.push(input);
    },
    consume: async (tokenHash: string, now = new Date()) => {
      const token = resetTokens.find(
        (candidate) => candidate.tokenHash === tokenHash && !candidate.usedAt && candidate.expiresAt > now,
      );
      if (!token) return null;
      token.usedAt = now;
      return { userId: token.userId };
    },
  } satisfies PasswordResetTokenRepository;
  const rateLimiter = { consume: async () => ({ allowed: true, retryAfterSeconds: 0 }) } satisfies RateLimiter;
  const passwordHasher: PasswordHasher = {
    hash: async (password) => `hashed:${password}`,
    verify: async () => false,
  };
  const mailer: PasswordResetMailer = {
    sendPasswordReset: async ({ to, resetUrl }) => {
      sent.push({ to, resetUrl });
    },
  };

  return {
    service: new PasswordResetService(
      userRepository,
      tokenRepository,
      sessionRepository,
      rateLimiter,
      passwordHasher,
      mailer,
      "https://jobs.example.com",
      () => new Date("2026-09-09T12:00:00.000Z"),
    ),
    users,
    resetTokens,
    sessions,
    sent,
  };
}

describe("PasswordResetService", () => {
  it("sends a reset link without exposing whether an email exists", async () => {
    const harness = createHarness();
    const known: PasswordResetRequestInput = { email: "candidate@example.com" };
    const unknown: PasswordResetRequestInput = { email: "missing@example.com" };

    await expect(harness.service.request(known)).resolves.toBeUndefined();
    await expect(harness.service.request(unknown)).resolves.toBeUndefined();

    expect(harness.sent).toHaveLength(1);
    expect(harness.sent[0]?.to).toBe(known.email);
    expect(harness.sent[0]?.resetUrl).toMatch(/^https:\/\/jobs\.example\.com\/reset-password\?token=/);
  });

  it("resets the password and invalidates existing sessions", async () => {
    const harness = createHarness();
    await harness.service.request({ email: "candidate@example.com" });
    const token = new URL(harness.sent[0]?.resetUrl ?? "").searchParams.get("token");
    const input: PasswordResetConfirmInput = {
      token: token ?? "",
      password: "new-password",
      passwordConfirmation: "new-password",
    };

    await expect(harness.service.confirm(input)).resolves.toBeUndefined();
    expect(harness.users.get(7)?.passwordHash).toBe("hashed:new-password");
    expect(harness.sessions).toHaveLength(0);
  });

  it("rejects a reset token after it has been consumed", async () => {
    const harness = createHarness();
    await expect(
      harness.service.confirm({ token: "not-valid", password: "new-password", passwordConfirmation: "new-password" }),
    ).rejects.toMatchObject({ code: "PASSWORD_RESET_INVALID" });
  });
});
