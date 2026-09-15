import { describe, expect, it } from "vitest";
import {
  applicationEventInputSchema,
  applicationEventTypeSchema,
  blacklistInputSchema,
  createApplicationInputSchema,
  loginInputSchema,
  passwordResetConfirmInputSchema,
  passwordResetRequestInputSchema,
  registerInputSchema,
  supportedLocaleSchema,
  themePreferenceSchema,
  updateApplicationEventInputSchema,
  updateApplicationInputSchema,
  updateUserPreferencesInputSchema,
} from "./index";

describe("activity event contracts", () => {
  it("accepts a dated manual note and trims its title", () => {
    expect(
      applicationEventInputSchema.parse({
        type: "note",
        title: "  Call recap  ",
        occurredAt: "2026-09-23T12:00:00.000Z",
      }),
    ).toEqual({
      type: "note",
      title: "Call recap",
      occurredAt: "2026-09-23T12:00:00.000Z",
    });
  });

  it("accepts every supported activity type and rejects unknown ones", () => {
    expect(applicationEventTypeSchema.options).toContain("status_changed");
    expect(applicationEventTypeSchema.options).toContain("follow_up");
    expect(applicationEventTypeSchema.safeParse("unknown").success).toBe(false);
    expect(
      applicationEventInputSchema.safeParse({
        type: "status_changed",
        title: "Changed",
        occurredAt: "2026-09-23T12:00:00Z",
      }).success,
    ).toBe(false);
  });

  it("rejects empty titles, invalid dates, and ownership fields", () => {
    expect(
      applicationEventInputSchema.safeParse({ type: "note", title: "  ", occurredAt: "2026-09-23T12:00:00Z" }).success,
    ).toBe(false);
    expect(
      applicationEventInputSchema.safeParse({ type: "note", title: "Note", occurredAt: "yesterday" }).success,
    ).toBe(false);
    expect(
      applicationEventInputSchema.safeParse({
        type: "note",
        title: "Note",
        occurredAt: "2026-09-23T12:00:00Z",
        applicationId: 2,
      }).success,
    ).toBe(false);
  });

  it("accepts partial edits but blocks system and ownership fields", () => {
    expect(updateApplicationEventInputSchema.parse({ title: " Edited ", description: null })).toEqual({
      title: "Edited",
      description: null,
    });
    expect(updateApplicationEventInputSchema.safeParse({}).success).toBe(false);
    expect(updateApplicationEventInputSchema.safeParse({ isSystem: false }).success).toBe(false);
  });
});

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
    expect(supportedLocaleSchema.options).toEqual(["en", "ru", "uk", "he"]);
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
