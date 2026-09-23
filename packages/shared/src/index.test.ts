import { describe, expect, it } from "vitest";
import {
  applicationEventInputSchema,
  applicationEventTypeSchema,
  blacklistInputSchema,
  createApplicationContactInputSchema,
  createApplicationFollowUpTaskInputSchema,
  createApplicationInputSchema,
  loginInputSchema,
  passwordResetConfirmInputSchema,
  passwordResetRequestInputSchema,
  registerInputSchema,
  supportedLocaleSchema,
  themePreferenceSchema,
  updateApplicationContactInputSchema,
  updateApplicationEventInputSchema,
  updateApplicationFollowUpTaskInputSchema,
  updateApplicationInputSchema,
  updateApplicationPreparationInputSchema,
  updateUserPreferencesInputSchema,
} from "./index";

describe("application workspace contracts", () => {
  it("trims preparation fields and permits explicit clearing", () => {
    expect(
      updateApplicationPreparationInputSchema.parse({ companyResearch: "  Company facts  ", talkingPoints: null }),
    ).toEqual({
      companyResearch: "Company facts",
      talkingPoints: null,
    });
    expect(updateApplicationPreparationInputSchema.parse({ interviewerQuestions: null })).toEqual({
      interviewerQuestions: null,
    });
  });

  it("requires a nonempty preparation update and caps each field at 10,000 characters", () => {
    expect(updateApplicationPreparationInputSchema.safeParse({}).success).toBe(false);
    for (const field of ["companyResearch", "talkingPoints", "interviewerQuestions"]) {
      expect(updateApplicationPreparationInputSchema.safeParse({ [field]: "x".repeat(10_000) }).success).toBe(true);
      expect(updateApplicationPreparationInputSchema.safeParse({ [field]: "x".repeat(10_001) }).success).toBe(false);
    }
  });

  it("accepts and trims a contact with optional fields", () => {
    expect(
      createApplicationContactInputSchema.parse({
        name: "  Ada  ",
        role: "  Recruiter  ",
        email: "  ada@example.com  ",
        phone: "  +1 555 1234  ",
        profileUrl: "  https://example.com/ada  ",
        notes: "  Met at interview  ",
      }),
    ).toEqual({
      name: "Ada",
      role: "Recruiter",
      email: "ada@example.com",
      phone: "+1 555 1234",
      profileUrl: "https://example.com/ada",
      notes: "Met at interview",
    });
  });

  it("enforces contact required fields and text limits", () => {
    expect(createApplicationContactInputSchema.safeParse({ name: " ", role: "Recruiter" }).success).toBe(false);
    expect(createApplicationContactInputSchema.safeParse({ name: "Ada", role: " " }).success).toBe(false);
    for (const [field, limit] of [
      ["name", 255],
      ["role", 255],
      ["email", 255],
      ["phone", 100],
      ["profileUrl", 500],
      ["notes", 10_000],
    ] as const) {
      const value =
        field === "email"
          ? `${"a".repeat(limit - 12)}@example.com`
          : field === "profileUrl"
            ? `https://example.com/${"a".repeat(limit - 20)}`
            : "x".repeat(limit);
      expect(
        createApplicationContactInputSchema.safeParse({ name: "Ada", role: "Recruiter", [field]: value }).success,
      ).toBe(true);
      expect(
        createApplicationContactInputSchema.safeParse({ name: "Ada", role: "Recruiter", [field]: `${value}x` }).success,
      ).toBe(false);
    }
    expect(
      createApplicationContactInputSchema.safeParse({ name: "Ada", role: "Recruiter", email: "bad" }).success,
    ).toBe(false);
  });

  it("rejects unsafe contact links and server-owned contact fields", () => {
    for (const profileUrl of ["javascript:alert(1)", "data:text/html,hi", "ftp://example.com/ada"]) {
      expect(
        createApplicationContactInputSchema.safeParse({ name: "Ada", role: "Recruiter", profileUrl }).success,
      ).toBe(false);
    }
    for (const field of ["userId", "applicationId", "id", "createdAt", "updatedAt"]) {
      expect(
        createApplicationContactInputSchema.safeParse({ name: "Ada", role: "Recruiter", [field]: 1 }).success,
      ).toBe(false);
    }
  });

  it("accepts partial contact updates and null clearing, but not empty or ownership updates", () => {
    expect(
      updateApplicationContactInputSchema.parse({ role: "  Hiring manager  ", email: null, profileUrl: null }),
    ).toEqual({
      role: "Hiring manager",
      email: null,
      profileUrl: null,
    });
    expect(updateApplicationContactInputSchema.safeParse({}).success).toBe(false);
    expect(updateApplicationContactInputSchema.safeParse({ name: " " }).success).toBe(false);
    expect(updateApplicationContactInputSchema.safeParse({ applicationId: 1 }).success).toBe(false);
  });

  it("accepts a dated follow-up and trims title and notes", () => {
    expect(
      createApplicationFollowUpTaskInputSchema.parse({
        title: "  Email Ada  ",
        dueDate: "2026-09-23",
        notes: "  Ask about next steps  ",
      }),
    ).toEqual({
      title: "Email Ada",
      dueDate: "2026-09-23",
      notes: "Ask about next steps",
    });
    expect(
      createApplicationFollowUpTaskInputSchema.safeParse({
        title: "x".repeat(255),
        dueDate: "2026-09-23",
        notes: "x".repeat(10_000),
      }).success,
    ).toBe(true);
    expect(
      createApplicationFollowUpTaskInputSchema.safeParse({ title: "x".repeat(256), dueDate: "2026-09-23" }).success,
    ).toBe(false);
    expect(
      createApplicationFollowUpTaskInputSchema.safeParse({
        title: "Task",
        dueDate: "2026-09-23",
        notes: "x".repeat(10_001),
      }).success,
    ).toBe(false);
  });

  it("rejects invalid due dates and server-owned follow-up fields", () => {
    for (const dueDate of ["2026-02-30", "2026-09-23T12:00:00Z", "23/09/2026", "2026-9-23"]) {
      expect(createApplicationFollowUpTaskInputSchema.safeParse({ title: "Task", dueDate }).success).toBe(false);
    }
    for (const field of ["userId", "applicationId", "id", "createdAt", "updatedAt", "completedAt"]) {
      expect(
        createApplicationFollowUpTaskInputSchema.safeParse({ title: "Task", dueDate: "2026-09-23", [field]: 1 })
          .success,
      ).toBe(false);
    }
  });

  it("accepts partial follow-up updates and null notes, but rejects completion updates", () => {
    expect(updateApplicationFollowUpTaskInputSchema.parse({ title: "  Call  ", notes: null })).toEqual({
      title: "Call",
      notes: null,
    });
    expect(updateApplicationFollowUpTaskInputSchema.safeParse({}).success).toBe(false);
    expect(updateApplicationFollowUpTaskInputSchema.safeParse({ completedAt: "2026-09-23T12:00:00Z" }).success).toBe(
      false,
    );
    expect(updateApplicationFollowUpTaskInputSchema.safeParse({ dueDate: "2026-02-30" }).success).toBe(false);
  });
});

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
