import { and, eq, gt, isNull } from "drizzle-orm";
import { passwordResetTokens } from "../schema";
import type { Database } from "./shared";
import type { PasswordResetTokenRepository } from "./types";
export class DrizzlePasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly database: Database) {}

  async invalidateForUser(userId: number): Promise<void> {
    await this.database
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
  }

  async create(input: { userId: number; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.database.insert(passwordResetTokens).values(input);
  }

  async consume(tokenHash: string, now = new Date()): Promise<{ userId: number } | null> {
    const [row] = await this.database
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .returning({ userId: passwordResetTokens.userId });
    return row ?? null;
  }
}
