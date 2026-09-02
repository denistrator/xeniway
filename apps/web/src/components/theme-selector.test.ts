import { describe, expect, test } from "vitest";
import { nextThemePreference } from "./theme-selector";

describe("nextThemePreference", () => {
  test("cycles through light, system, and dark preferences", () => {
    expect(nextThemePreference("light")).toBe("system");
    expect(nextThemePreference("system")).toBe("dark");
    expect(nextThemePreference("dark")).toBe("light");
  });
});
