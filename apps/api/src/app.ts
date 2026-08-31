import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import {
  messageInputSchema,
  type ApiError,
  type HealthResponse,
  type HelloResponse,
} from "@hello/shared";
import type { MessageRepository } from "./db/repository";

export function createApp(repository: MessageRepository) {
  return new Elysia()
    .use(cors())
    .get("/api/health", async ({ set }) => {
      try {
        if (await repository.health()) {
          const response: HealthResponse = { status: "ok", database: "up" };
          return response;
        }
      } catch {
        // Return the same service error for repository exceptions and false health checks.
      }

      set.status = 503;
      return errorResponse("DATABASE_UNAVAILABLE", "Database is unavailable");
    })
    .get("/api/hello", () => {
      const response: HelloResponse = {
        message: "Hello from Bun + Elysia!",
        runtime: "bun",
        timestamp: new Date().toISOString(),
      };
      return response;
    })
    .get("/api/messages", async ({ set }) => {
      try {
        return await repository.list();
      } catch {
        set.status = 500;
        return errorResponse("PERSISTENCE_ERROR", "Unable to load messages");
      }
    })
    .post("/api/messages", async ({ body, set }) => {
      const parsed = messageInputSchema.safeParse(body as unknown);

      if (!parsed.success) {
        set.status = 400;
        return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid message");
      }

      try {
        return await repository.create(parsed.data);
      } catch {
        set.status = 500;
        return errorResponse("PERSISTENCE_ERROR", "Unable to store message");
      }
    });
}

function errorResponse(code: string, message: string): ApiError {
  return { error: { code, message } };
}
