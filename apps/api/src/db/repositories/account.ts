import type { UpdateUserPreferencesInput } from "@xeniway/shared";
import { and, eq, gt, lte } from "drizzle-orm";
import { sessions, userPreferences, users } from "../schema";
import type { Database } from "./shared";
import type {
  SessionRepository,
  SessionRow,
  UserPreferencesRepository,
  UserPreferencesRow,
  UserRepository,
  UserRow,
} from "./types";
export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly database: Database) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    const [row] = await this.database.select().from(users).where(eq(users.email, email)).limit(1);
    return row ?? null;
  }

  async findById(id: number): Promise<UserRow | null> {
    const [row] = await this.database.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  async create(input: {
    email: string;
    passwordHash: string;
    firstName?: string | null;
    lastName?: string | null;
  }): Promise<UserRow> {
    const [row] = await this.database.insert(users).values(input).returning();
    if (!row) throw new Error("Unable to create user");
    return row;
  }

  async updatePasswordHash(id: number, passwordHash: string): Promise<boolean> {
    const result = await this.database.update(users).set({ passwordHash }).where(eq(users.id, id));
    return result.count > 0;
  }
}

export class DrizzleSessionRepository implements SessionRepository {
  constructor(private readonly database: Database) {}

  async create(input: { id: string; userId: number | null; csrfToken: string; expiresAt: Date }): Promise<void> {
    await this.database.insert(sessions).values(input);
  }

  async findActive(id: string): Promise<SessionRow | null> {
    const [row] = await this.database
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
      .limit(1);
    return row ?? null;
  }

  async delete(id: string): Promise<void> {
    await this.database.delete(sessions).where(eq(sessions.id, id));
  }

  async deleteForUser(userId: number): Promise<void> {
    await this.database.delete(sessions).where(eq(sessions.userId, userId));
  }

  async deleteExpired(): Promise<void> {
    await this.database.delete(sessions).where(lte(sessions.expiresAt, new Date()));
  }
}

export class DrizzleUserPreferencesRepository implements UserPreferencesRepository {
  constructor(private readonly database: Database) {}

  async findByUserId(userId: number): Promise<UserPreferencesRow | null> {
    const [row] = await this.database.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
    return row ?? null;
  }

  async update(userId: number, input: UpdateUserPreferencesInput): Promise<UserPreferencesRow> {
    const values = { userId, ...input };
    const [row] = await this.database
      .insert(userPreferences)
      .values(values)
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();
    if (!row) throw new Error("Unable to update user preferences");
    return row;
  }

  async markIntroduced(userId: number): Promise<UserPreferencesRow> {
    const [row] = await this.database
      .insert(userPreferences)
      .values({ userId, wasIntroduced: true })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { wasIntroduced: true, updatedAt: new Date() },
      })
      .returning();
    if (!row) throw new Error("Unable to update user preferences");
    return row;
  }
}
