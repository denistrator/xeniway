import { desc } from "drizzle-orm";
import type { Message, MessageInput } from "@hello/shared";
import type { createDatabase, createPostgresClient } from "./client";
import { messages } from "./schema";

export interface MessageRepository {
  health(): Promise<boolean>;
  list(): Promise<Message[]>;
  create(input: MessageInput): Promise<Message>;
}

export class DrizzleMessageRepository implements MessageRepository {
  constructor(
    private readonly database: ReturnType<typeof createDatabase>,
    private readonly client: ReturnType<typeof createPostgresClient>,
  ) {}

  async health(): Promise<boolean> {
    try {
      await this.client`select 1`;
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<Message[]> {
    const rows = await this.database.select().from(messages).orderBy(desc(messages.createdAt));
    return rows.map(toMessage);
  }

  async create(input: MessageInput): Promise<Message> {
    const [row] = await this.database.insert(messages).values({ text: input.text }).returning();
    return toMessage(row);
  }
}

function toMessage(row: typeof messages.$inferSelect): Message {
  return {
    id: row.id,
    text: row.text,
    createdAt: row.createdAt.toISOString(),
  };
}
