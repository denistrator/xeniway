import { describe, expect, test } from "vitest";
import { emptyApplicationForm, normalizeApplicationForm } from "./application-form";

describe("application form helpers", () => {
  test("normalizes optional form values for the API", () => {
    expect(normalizeApplicationForm({ ...emptyApplicationForm, company: "Acme", position: "Engineer" })).toMatchObject({
      company: "Acme",
      position: "Engineer",
      location: null,
      salary: null,
      jobUrl: null,
    });
  });
});
