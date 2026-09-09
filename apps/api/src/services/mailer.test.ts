import { describe, expect, it } from "vitest";
import { ConsolePasswordResetMailer } from "./mailer";

describe("ConsolePasswordResetMailer", () => {
  it("writes the reset URL through the injected logger", async () => {
    const messages: string[] = [];
    const mailer = new ConsolePasswordResetMailer((message) => messages.push(message));

    await mailer.sendPasswordReset({
      to: "candidate@example.com",
      resetUrl: "https://jobs.example.com/reset-password?token=secret",
      expiresAt: new Date("2026-09-09T13:00:00.000Z"),
    });

    expect(messages[0]).toContain("https://jobs.example.com/reset-password?token=secret");
    expect(messages[0]).toContain("candidate@example.com");
  });
});
