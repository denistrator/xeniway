import { describe, expect, it } from "vitest";
import { ApiRequestError, applicationKeys, parseApiError } from "./api";

describe("web API helpers", () => {
  it("extracts the stable API error message", () => {
    expect(parseApiError({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } })).toEqual({
      code: "VALIDATION_ERROR",
      message: "Validation failed",
    });
  });

  it("creates isolated query keys for active and archived applications", () => {
    expect(applicationKeys.list("active")).toEqual(["applications", "list", "active"]);
    expect(applicationKeys.list("archive")).toEqual(["applications", "list", "archive"]);
  });

  it("keeps API error identity and HTTP status together", () => {
    const error = new ApiRequestError("Unauthenticated", "UNAUTHENTICATED", 401);
    expect(error).toMatchObject({ code: "UNAUTHENTICATED", status: 401, message: "Unauthenticated" });
    expect(error.name).toBe("ApiRequestError");
  });
});
