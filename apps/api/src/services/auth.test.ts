import type { LoginInput, RegisterInput } from "@xeniway/shared";
import { describe, expect, it } from "vitest";
import type { SessionRepository, UserRepository } from "../db/repository";
import { AuthService, type PasswordHasher } from "./auth";

function createHarness() {
  const users: Array<{
    id: number;
    email: string;
    passwordHash: string;
    firstName: string | null;
    lastName: string | null;
    createdAt: Date;
  }> = [];
  const sessions = new Map<string, { id: string; userId: number | null; csrfToken: string; expiresAt: Date }>();

  const userRepository: UserRepository = {
    async findByEmail(email) {
      return users.find((user) => user.email === email) ?? null;
    },
    async findById(id) {
      return users.find((user) => user.id === id) ?? null;
    },
    async create(input) {
      const user = {
        id: users.length + 1,
        email: input.email,
        passwordHash: input.passwordHash,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
      };
      users.push(user);
      return user;
    },
    async updatePasswordHash(id, passwordHash) {
      const user = users.find((candidate) => candidate.id === id);
      if (!user) return false;
      user.passwordHash = passwordHash;
      return true;
    },
  };

  const sessionRepository: SessionRepository = {
    async create(input) {
      sessions.set(input.id, input);
    },
    async findActive(id) {
      const session = sessions.get(id);
      return session && session.expiresAt > new Date() ? session : null;
    },
    async delete(id) {
      sessions.delete(id);
    },
    async deleteForUser(userId) {
      for (const [id, session] of sessions) {
        if (session.userId === userId) sessions.delete(id);
      }
    },
    async deleteExpired() {
      for (const [id, session] of sessions) {
        if (session.expiresAt <= new Date()) sessions.delete(id);
      }
    },
  };

  const passwordHasher: PasswordHasher = {
    async hash(password) {
      return `hashed:${password}`;
    },
    async verify(password, hash) {
      return hash === `hashed:${password}`;
    },
  };

  return { service: new AuthService(userRepository, sessionRepository, passwordHasher), sessions };
}

describe("AuthService", () => {
  it("registers a normalized user and creates a session", async () => {
    const { service, sessions } = createHarness();
    const input: RegisterInput = { email: " CANDIDATE@EXAMPLE.COM ", password: "password123" };

    const result = await service.register(input);

    expect(result.user.email).toBe("candidate@example.com");
    expect(result.sessionId).toBeTruthy();
    expect(result.csrfToken).toBeTruthy();
    expect(sessions.size).toBe(1);
  });

  it("rejects invalid credentials without revealing whether the user exists", async () => {
    const { service } = createHarness();
    const input: LoginInput = { email: "candidate@example.com", password: "wrong-password" };

    await expect(service.login(input)).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("rejects duplicate email registration", async () => {
    const { service } = createHarness();
    await service.register({ email: "candidate@example.com", password: "password123" });

    await expect(service.register({ email: " CANDIDATE@example.com ", password: "password123" })).rejects.toMatchObject(
      {
        code: "EMAIL_TAKEN",
      },
    );
  });

  it("does not restore identity from an expired session", async () => {
    const { service, sessions } = createHarness();
    const registered = await service.register({ email: "candidate@example.com", password: "password123" });
    const session = sessions.get(registered.sessionId);
    if (!session) throw new Error("Missing test session");
    session.expiresAt = new Date(0);

    await expect(service.getCurrentUser(registered.sessionId)).resolves.toBeNull();
  });

  it("accepts the session CSRF token and rejects a different token", async () => {
    const { service } = createHarness();
    const { sessionId, csrfToken } = await service.createCsrfSession();

    await expect(service.verifyCsrf(sessionId, csrfToken)).resolves.toBe(true);
    await expect(service.verifyCsrf(sessionId, "wrong-token")).resolves.toBe(false);
  });
});
