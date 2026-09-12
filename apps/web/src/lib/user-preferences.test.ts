import { beforeEach, describe, expect, it, vi } from "vitest";
import { readLocalUserPreferences, userPreferencesStorageKey, writeLocalUserPreferences } from "./user-preferences";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("local user preferences", () => {
  it("returns defaults when the cache contains malformed JSON", () => {
    localStorage.setItem(userPreferencesStorageKey, "not-json");

    expect(readLocalUserPreferences()).toMatchObject({
      theme: "system",
      language: "en",
      wasIntroduced: false,
    });
  });

  it("falls back independently for invalid fields", () => {
    localStorage.setItem(
      userPreferencesStorageKey,
      JSON.stringify({ theme: "neon", language: "uk", wasIntroduced: "yes" }),
    );

    expect(readLocalUserPreferences()).toEqual({
      theme: "system",
      language: "uk",
      formPresentation: "drawer",
      wasIntroduced: false,
    });
  });

  it("preserves valid cached values when writing a partial update", () => {
    writeLocalUserPreferences({ theme: "dark", language: "ru", wasIntroduced: true });

    expect(writeLocalUserPreferences({ theme: "light" })).toEqual({
      theme: "light",
      language: "ru",
      formPresentation: "drawer",
      wasIntroduced: true,
    });
  });

  it("persists form presentation in the unified preference object", () => {
    expect(writeLocalUserPreferences({ formPresentation: "modal" })).toMatchObject({ formPresentation: "modal" });
    expect(JSON.parse(window.localStorage.getItem(userPreferencesStorageKey) ?? "{}")).toMatchObject({
      formPresentation: "modal",
    });
  });

  it("does not throw when local storage is unavailable", () => {
    const storage = window.localStorage;
    vi.stubGlobal("localStorage", undefined);
    Object.defineProperty(window, "localStorage", { configurable: true, value: undefined });

    expect(readLocalUserPreferences()).toMatchObject({ theme: "system", language: "en" });
    expect(writeLocalUserPreferences({ theme: "dark" }).theme).toBe("dark");

    Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
  });
});
