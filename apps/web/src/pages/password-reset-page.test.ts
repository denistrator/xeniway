import { describe, expect, it } from "vitest";
import { getResetToken } from "./password-reset-page";

describe("password reset page", () => {
  it("reads the reset token from the URL search string", () => {
    expect(getResetToken("?token=abc123")).toBe("abc123");
    expect(getResetToken("?other=value")).toBeNull();
  });
});
