import { describe, expect, it } from "vitest";
import { resolveAuthReturnTo } from "./auth-return-to";

describe("resolveAuthReturnTo", () => {
  it.each([
    ["/applications/42?tab=activity#event-3", "/applications/42?tab=activity#event-3"],
    ["/archive", "/archive"],
    ["/blacklist?sort=recent", "/blacklist?sort=recent"],
    ["/settings", "/settings"],
    [null, "/"],
    ["https://example.com", "/"],
    ["//example.com", "/"],
    ["/login", "/"],
    ["/applications/not-an-id", "/"],
  ])("resolves %s to %s", (value, expected) => {
    expect(resolveAuthReturnTo(value)).toBe(expected);
  });
});
