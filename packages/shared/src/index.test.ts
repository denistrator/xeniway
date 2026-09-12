import { describe, expect, it } from "vitest";
import {
  blacklistInputSchema,
  createApplicationInputSchema,
  loginInputSchema,
  passwordResetConfirmInputSchema,
  passwordResetRequestInputSchema,
  registerInputSchema,
  supportedLocaleSchema,
  themePreferenceSchema,
  updateApplicationInputSchema,
  updateUserPreferencesInputSchema,
} from "./index";

describe("application contracts", () => {
  it("normalizes an optional blacklist reason and enforces its limit", () => {
    expect(blacklistInputSchema.parse({ reason: "  Duplicate employer  " })).toEqual({
      reason: "Duplicate employer",
    });
    expect(blacklistInputSchema.parse({})).toEqual({});
    expect(blacklistInputSchema.safeParse({ reason: "x".repeat(1001) }).success).toBe(false);
  });

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

  it("normalizes password reset request email", () => {
    expect(passwordResetRequestInputSchema.parse({ email: " USER@EXAMPLE.COM " })).toEqual({
      email: "user@example.com",
    });
  });

  it("requires matching password reset confirmation", () => {
    expect(
      passwordResetConfirmInputSchema.safeParse({
        token: "reset-token",
        password: "password123",
        passwordConfirmation: "different",
      }).success,
    ).toBe(false);
    expect(
      passwordResetConfirmInputSchema.parse({
        token: "reset-token",
        password: "password123",
        passwordConfirmation: "password123",
      }),
    ).toEqual({ token: "reset-token", password: "password123", passwordConfirmation: "password123" });
  });
});

describe("user preference contracts", () => {
  it("accepts valid form presentation preferences", () => {
    expect(updateUserPreferencesInputSchema.parse({ selectedFormPresentation: "modal" })).toEqual({
      selectedFormPresentation: "modal",
    });
    expect(() => updateUserPreferencesInputSchema.parse({ selectedFormPresentation: "popover" })).toThrow();
  });

  it("accepts the supported locales and themes only", () => {
    expect(supportedLocaleSchema.options).toEqual(["en", "ru", "uk"]);
    expect(themePreferenceSchema.options).toEqual(["light", "dark", "system"]);
    expect(supportedLocaleSchema.safeParse("fr").success).toBe(false);
    expect(themePreferenceSchema.safeParse("blue").success).toBe(false);
  });

  it("requires at least one preference in an update", () => {
    expect(updateUserPreferencesInputSchema.parse({ selectedLanguage: "uk" })).toEqual({
      selectedLanguage: "uk",
    });
    expect(updateUserPreferencesInputSchema.parse({ selectedTheme: "dark" })).toEqual({
      selectedTheme: "dark",
    });
    expect(updateUserPreferencesInputSchema.parse({ selectedLanguage: null, selectedTheme: "system" })).toEqual({
      selectedLanguage: null,
      selectedTheme: "system",
    });
    expect(() => updateUserPreferencesInputSchema.parse({})).toThrow();
    expect(() => updateUserPreferencesInputSchema.parse({ selectedTheme: "blue" })).toThrow();
  });
});
