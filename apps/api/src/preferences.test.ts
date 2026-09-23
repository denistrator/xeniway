import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { createDependencies, jsonRequest, register } from "./app-test-support";

describe("user preferences API", () => {
  it("reads and completes user introduction preferences with CSRF protection", async () => {
    const app = createApp(createDependencies());
    const account = await register(app, "preferences@example.com");
    const csrf = { sessionId: account.sessionId, csrfToken: account.payload.data.csrfToken };

    const initial = await app.handle(
      new Request("http://localhost/api/user/preferences", {
        headers: { cookie: `session_id=${csrf.sessionId}` },
      }),
    );
    expect(initial.status).toBe(200);
    expect((await initial.json()).data.preferences).toMatchObject({
      wasIntroduced: false,
      selectedLanguage: null,
      selectedTheme: null,
      selectedFormPresentation: null,
    });

    const invalid = await app.handle(
      new Request("http://localhost/api/user/preferences/introduced", {
        method: "POST",
        headers: { cookie: `session_id=${csrf.sessionId}` },
      }),
    );
    expect(invalid.status).toBe(403);

    const completed = await app.handle(
      jsonRequest(
        "http://localhost/api/user/preferences/introduced",
        { method: "POST" },
        csrf.sessionId,
        csrf.csrfToken,
      ),
    );
    expect(completed.status).toBe(200);
    expect((await completed.json()).data.preferences.wasIntroduced).toBe(true);
  });

  it("keeps introduction preferences isolated between accounts", async () => {
    const app = createApp(createDependencies());
    const first = await register(app, "first-preferences@example.com");
    const second = await register(app, "second-preferences@example.com");

    const completed = await app.handle(
      jsonRequest(
        "http://localhost/api/user/preferences/introduced",
        { method: "POST" },
        first.sessionId,
        first.payload.data.csrfToken,
      ),
    );
    expect(completed.status).toBe(200);

    const secondPreferences = await app.handle(
      new Request("http://localhost/api/user/preferences", {
        headers: { cookie: `session_id=${second.sessionId}` },
      }),
    );
    expect((await secondPreferences.json()).data.preferences.wasIntroduced).toBe(false);
  });

  it("updates both user preferences and preserves omitted values", async () => {
    const app = createApp(createDependencies());
    const account = await register(app, "update-preferences@example.com");
    const csrf = { sessionId: account.sessionId, csrfToken: account.payload.data.csrfToken };

    const initial = await app.handle(
      jsonRequest(
        "http://localhost/api/user/preferences",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            selectedLanguage: "uk",
            selectedTheme: "dark",
            selectedFormPresentation: "modal",
          }),
        },
        csrf.sessionId,
        csrf.csrfToken,
      ),
    );
    expect(initial.status).toBe(200);
    expect((await initial.json()).data.preferences).toMatchObject({
      selectedLanguage: "uk",
      selectedTheme: "dark",
      selectedFormPresentation: "modal",
    });

    const languageOnly = await app.handle(
      jsonRequest(
        "http://localhost/api/user/preferences",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ selectedLanguage: "ru" }),
        },
        csrf.sessionId,
        csrf.csrfToken,
      ),
    );
    expect(languageOnly.status).toBe(200);
    expect((await languageOnly.json()).data.preferences).toMatchObject({
      selectedLanguage: "ru",
      selectedTheme: "dark",
      selectedFormPresentation: "modal",
    });
  });

  it("validates preference updates and protects them with authentication and CSRF", async () => {
    const app = createApp(createDependencies());
    const unauthenticated = await app.handle(
      new Request("http://localhost/api/user/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selectedLanguage: "uk" }),
      }),
    );
    expect(unauthenticated.status).toBe(401);

    const account = await register(app, "invalid-preferences@example.com");
    const csrf = { sessionId: account.sessionId, csrfToken: account.payload.data.csrfToken };
    const missingCsrf = await app.handle(
      new Request("http://localhost/api/user/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie: `session_id=${csrf.sessionId}` },
        body: JSON.stringify({ selectedTheme: "dark" }),
      }),
    );
    expect(missingCsrf.status).toBe(403);

    const invalidCsrf = await app.handle(
      jsonRequest(
        "http://localhost/api/user/preferences",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ selectedTheme: "dark" }),
        },
        csrf.sessionId,
        "invalid-csrf-token",
      ),
    );
    expect(invalidCsrf.status).toBe(403);

    const invalid = await app.handle(
      jsonRequest(
        "http://localhost/api/user/preferences",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ selectedLanguage: "de", selectedTheme: "solarized" }),
        },
        csrf.sessionId,
        csrf.csrfToken,
      ),
    );
    expect(invalid.status).toBe(422);
    expect((await invalid.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("does not expose preference values across accounts", async () => {
    const app = createApp(createDependencies());
    const first = await register(app, "first-update-preferences@example.com");
    const second = await register(app, "second-update-preferences@example.com");

    const updated = await app.handle(
      jsonRequest(
        "http://localhost/api/user/preferences",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ selectedLanguage: "uk", selectedTheme: "dark" }),
        },
        first.sessionId,
        first.payload.data.csrfToken,
      ),
    );
    expect(updated.status).toBe(200);

    const secondPreferences = await app.handle(
      new Request("http://localhost/api/user/preferences", {
        headers: { cookie: `session_id=${second.sessionId}` },
      }),
    );
    expect((await secondPreferences.json()).data.preferences).toMatchObject({
      selectedLanguage: null,
      selectedTheme: null,
    });
  });
});
