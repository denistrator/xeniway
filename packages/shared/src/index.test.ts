import { describe, expect, it } from "vitest";
import { messageInputSchema } from "./index";

describe("messageInputSchema", () => {
  it("accepts trimmed message text", () => {
    expect(messageInputSchema.parse({ text: "  hello  " })).toEqual({ text: "hello" });
  });

  it("rejects empty and overlong text", () => {
    expect(messageInputSchema.safeParse({ text: "   " }).success).toBe(false);
    expect(messageInputSchema.safeParse({ text: "x".repeat(241) }).success).toBe(false);
  });
});
