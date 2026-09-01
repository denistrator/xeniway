import type { LoginInput, RegisterInput, User } from "@job-tracker/shared";
import { type SessionRepository, toUser, type UserRepository } from "../db/repository";

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export type PasswordHasher = {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
};

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_CREDENTIALS" | "EMAIL_TAKEN" | "UNAUTHENTICATED",
  ) {
    super(message);
  }
}

export type AuthenticatedSession = {
  user: User;
  sessionId: string;
  csrfToken: string;
};

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly passwordHasher: PasswordHasher = {
      hash: (password) => Bun.password.hash(password, { algorithm: "argon2id" }),
      verify: (password, hash) => Bun.password.verify(password, hash),
    },
  ) {}

  async register(input: RegisterInput): Promise<AuthenticatedSession> {
    const email = input.email.trim().toLowerCase();
    if (await this.users.findByEmail(email)) {
      throw new AuthError("This email is already registered", "EMAIL_TAKEN");
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.users.create({
      email,
      passwordHash,
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
    });

    return { user: toUser(user), ...(await this.createAuthenticatedSession(user.id)) };
  }

  async login(input: LoginInput): Promise<AuthenticatedSession> {
    const email = input.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user || !(await this.passwordHasher.verify(input.password, user.passwordHash))) {
      throw new AuthError("Invalid credentials", "INVALID_CREDENTIALS");
    }

    return { user: toUser(user), ...(await this.createAuthenticatedSession(user.id)) };
  }

  async createCsrfSession(): Promise<{ sessionId: string; csrfToken: string }> {
    const sessionId = crypto.randomUUID();
    const csrfToken = crypto.randomUUID();
    await this.sessions.create({
      id: sessionId,
      userId: null,
      csrfToken,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
    return { sessionId, csrfToken };
  }

  async getCurrentUser(sessionId: string | undefined): Promise<User | null> {
    if (!sessionId) return null;
    const session = await this.sessions.findActive(sessionId);
    if (!session?.userId) return null;
    const user = await this.users.findById(session.userId);
    return user ? toUser(user) : null;
  }

  async verifyCsrf(sessionId: string | undefined, csrfToken: string | undefined): Promise<boolean> {
    if (!sessionId || !csrfToken) return false;
    const session = await this.sessions.findActive(sessionId);
    return session?.csrfToken === csrfToken;
  }

  async getCsrfToken(sessionId: string | undefined): Promise<string | null> {
    if (!sessionId) return null;
    const session = await this.sessions.findActive(sessionId);
    return session?.csrfToken ?? null;
  }

  async logout(sessionId: string | undefined): Promise<void> {
    if (sessionId) await this.sessions.delete(sessionId);
  }

  async deleteExpiredSessions(): Promise<void> {
    await this.sessions.deleteExpired();
  }

  private async createAuthenticatedSession(userId: number): Promise<{
    sessionId: string;
    csrfToken: string;
  }> {
    const sessionId = crypto.randomUUID();
    const csrfToken = crypto.randomUUID();
    await this.sessions.create({
      id: sessionId,
      userId,
      csrfToken,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
    return { sessionId, csrfToken };
  }
}
