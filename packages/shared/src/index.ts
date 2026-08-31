import { z } from "zod";

export const messageInputSchema = z.object({
  text: z.string().trim().min(1).max(240),
});

export type MessageInput = z.infer<typeof messageInputSchema>;

export type Message = {
  id: number;
  text: string;
  createdAt: string;
};

export type HelloResponse = {
  message: string;
  runtime: "bun";
  timestamp: string;
};

export type HealthResponse = {
  status: "ok" | "error";
  database: "up" | "down";
};

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};
