import { describe, expect, test } from "vitest";
import { applicationToForm, emptyApplicationForm, normalizeApplicationForm } from "./application-form";

describe("application form helpers", () => {
  test("creates an empty form when no application is selected", () => {
    expect(applicationToForm()).toEqual(emptyApplicationForm);
  });

  test("maps nullable application fields to editable strings", () => {
    expect(applicationToForm({ id: 1, company: "Acme", position: "Engineer", status: "saved" } as never)).toEqual({
      ...emptyApplicationForm,
      company: "Acme",
      position: "Engineer",
    });
  });

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
