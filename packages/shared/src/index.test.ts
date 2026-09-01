import { describe, expect, it } from "vitest";
import {
  createApplicationInputSchema,
  loginInputSchema,
  registerInputSchema,
  updateApplicationInputSchema,
} from "./index";

describe("application contracts", () => {
  it("accepts a complete application and normalizes optional text", () => {
    expect(
      createApplicationInputSchema.parse({
        company: "  Acme  ",
        position: "  Engineer  ",
        status: "interview",
        location: "  Remote  ",
      }),
    ).toMatchObject({
      company: "Acme",
      position: "Engineer",
      location: "Remote",
      status: "interview",
    });
  });

  it("rejects missing required fields and unsupported statuses", () => {
    expect(createApplicationInputSchema.safeParse({ company: "", position: "Engineer" }).success).toBe(false);
    expect(
      createApplicationInputSchema.safeParse({ company: "Acme", position: "Engineer", status: "unknown" }).success,
    ).toBe(false);
  });

  it("accepts partial updates without requiring company or position", () => {
    expect(updateApplicationInputSchema.parse({ status: "offer", notes: null })).toEqual({
      status: "offer",
      notes: null,
    });
  });
});

describe("authentication contracts", () => {
  it("normalizes registration email and requires a strong password", () => {
    expect(registerInputSchema.parse({ email: " USER@EXAMPLE.COM ", password: "password123" })).toMatchObject({
      email: "user@example.com",
      password: "password123",
    });
    expect(registerInputSchema.safeParse({ email: "user@example.com", password: "short" }).success).toBe(false);
  });

  it("rejects malformed login credentials", () => {
    expect(loginInputSchema.safeParse({ email: "not-an-email", password: "password123" }).success).toBe(false);
  });
});
