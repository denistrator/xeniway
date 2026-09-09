import { createHash, randomBytes } from "node:crypto";
import type { PasswordResetConfirmInput, PasswordResetRequestInput } from "@job-tracker/shared";
import type { PasswordResetTokenRepository, SessionRepository, UserRepository } from "../db/repository";
import type { PasswordHasher } from "./auth";
import type { PasswordResetMailer } from "./mailer";
import type { RateLimiter } from "./rate-limit";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1_000;

export class PasswordResetError extends Error {
  constructor(
    message: string,
    public readonly code: "PASSWORD_RESET_INVALID" | "PASSWORD_RESET_RATE_LIMITED",
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

export class PasswordResetService {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: PasswordResetTokenRepository,
    private readonly sessions: SessionRepository,
    private readonly rateLimiter: RateLimiter,
    private readonly passwordHasher: PasswordHasher,
    private readonly mailer: PasswordResetMailer,
    private readonly appOrigin: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async request(input: PasswordResetRequestInput): Promise<void> {
    const rateLimit = await this.rateLimiter.consume(`password-reset:${input.email}`);
    if (!rateLimit.allowed)
      throw new PasswordResetError(
        "Too many password reset requests",
        "PASSWORD_RESET_RATE_LIMITED",
        rateLimit.retryAfterSeconds,
      );

    const user = await this.users.findByEmail(input.email);
    if (!user) return;

    const rawToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(this.now().getTime() + RESET_TOKEN_TTL_MS);
    await this.tokens.invalidateForUser(user.id);
    await this.tokens.create({ userId: user.id, tokenHash: hashToken(rawToken), expiresAt });
    const resetUrl = new URL("/reset-password", this.appOrigin);
    resetUrl.searchParams.set("token", rawToken);
    await this.mailer.sendPasswordReset({ to: user.email, resetUrl: resetUrl.toString(), expiresAt });
  }

  async confirm(input: PasswordResetConfirmInput): Promise<void> {
    const consumed = await this.tokens.consume(hashToken(input.token), this.now());
    if (!consumed)
      throw new PasswordResetError("This password reset link is invalid or expired", "PASSWORD_RESET_INVALID");

    const passwordHash = await this.passwordHasher.hash(input.password);
    if (!(await this.users.updatePasswordHash(consumed.userId, passwordHash)))
      throw new PasswordResetError("This password reset link is invalid or expired", "PASSWORD_RESET_INVALID");
    await this.sessions.deleteForUser(consumed.userId);
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
