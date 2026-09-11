import { expect, test } from "vitest";
import { formatDate } from "./format";

test("formats an ISO date using the active locale", () => {
  expect(formatDate("2026-09-11", "uk")).toBe(
    new Intl.DateTimeFormat("uk", { dateStyle: "medium" }).format(new Date("2026-09-11")),
  );
});
