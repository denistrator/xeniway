import { describe, expect, it } from "vitest";
import { getRouteTitle } from "./layout.model";

const titles: Record<string, string> = {
  "navigation.applications": "Applications",
  "applications.archive.title": "Archive",
  "applications.blacklist.title": "Blacklist",
  "navigation.settings": "Settings",
  "auth.login.title": "Welcome back",
  "auth.register.title": "Create your account",
  "auth.forgotPassword.title": "Forgot your password?",
  "auth.resetPassword.title": "Choose a new password",
  "navigation.about": "About",
  "notFound.title": "Page not found",
};

describe("getRouteTitle", () => {
  it("selects a localized title for auth and protected routes", () => {
    const t = (key: string) => titles[key] ?? key;

    expect(getRouteTitle("/login", t)).toBe("Welcome back");
    expect(getRouteTitle("/applications/12", t)).toBe("Applications");
    expect(getRouteTitle("/reset-password", t)).toBe("Choose a new password");
    expect(getRouteTitle("/unknown", t)).toBe("Page not found");
  });
});
