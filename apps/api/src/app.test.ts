import { describe, expect, it } from "vitest";
import type { Message, MessageInput } from "@hello/shared";
import { createApp } from "./app";
import type { MessageRepository } from "./db/repository";

function createFakeRepository(overrides: Partial<MessageRepository> = {}): MessageRepository {
  const messages: Message[] = [];

  return {
    async health() {
      return true;
    },
    async list() {
      return messages;
    },
    async create(input: MessageInput) {
      const message: Message = {
        id: messages.length + 1,
        text: input.text,
        createdAt: new Date().toISOString(),
      };
      messages.push(message);
      return message;
    },
    ...overrides,
  };
}

describe("API routes", () => {
  it("returns a hello response", async () => {
    const response = await createApp(createFakeRepository()).handle(
      new Request("http://localhost/api/hello"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      message: "Hello from Bun + Elysia!",
      runtime: "bun",
    });
  });

  it("reports a healthy database", async () => {
    const response = await createApp(createFakeRepository()).handle(
      new Request("http://localhost/api/health"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", database: "up" });
  });

  it("returns a service-unavailable error for an unhealthy database", async () => {
    const response = await createApp(createFakeRepository({ health: async () => false })).handle(
      new Request("http://localhost/api/health"),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "DATABASE_UNAVAILABLE" } });
  });

  it("validates and stores messages", async () => {
    const app = createApp(createFakeRepository());
    const response = await app.handle(
      new Request("http://localhost/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: " hello " }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: 1, text: "hello" });
  });

  it("lists stored messages", async () => {
    const app = createApp(createFakeRepository());
    await app.handle(
      new Request("http://localhost/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      }),
    );

    const response = await app.handle(new Request("http://localhost/api/messages"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject([{ id: 1, text: "hello" }]);
  });

  it("returns a persistence error when listing messages fails", async () => {
    const response = await createApp(
      createFakeRepository({
        list: async () => {
          throw new Error("database unavailable");
        },
      }),
    ).handle(new Request("http://localhost/api/messages"));

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: { code: "PERSISTENCE_ERROR" } });
  });

  it("rejects invalid messages", async () => {
    const response = await createApp(createFakeRepository()).handle(
      new Request("http://localhost/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "   " }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });

  it("returns a persistence error when storing a message fails", async () => {
    const response = await createApp(
      createFakeRepository({
        create: async () => {
          throw new Error("database unavailable");
        },
      }),
    ).handle(
      new Request("http://localhost/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: { code: "PERSISTENCE_ERROR" } });
  });
});
